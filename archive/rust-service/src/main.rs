use serde::{Deserialize, Serialize};
use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::Duration;
use syncsenta_moe_core::adaptive_question::{
    choose_next_question, AdaptiveQuestionRequest, NextQuestionAction,
};

const MAX_BODY_BYTES: usize = 8 * 1024;

#[derive(Debug, Deserialize)]
struct DecisionInput {
    #[serde(rename = "lessonId")]
    lesson_id: String,
    grade: String,
    subject: String,
    competency: String,
    #[serde(rename = "currentIndex")]
    current_index: usize,
    #[serde(rename = "totalQuestions")]
    total_questions: usize,
    #[serde(rename = "attemptCount")]
    attempt_count: u32,
    #[serde(rename = "correctCount")]
    correct_count: u32,
    #[serde(rename = "hintLevel")]
    hint_level: u8,
    #[serde(rename = "lastCorrect")]
    last_correct: bool,
    interest: Option<String>,
    #[serde(rename = "masteryThreshold")]
    mastery_threshold: u32,
}

#[derive(Debug, Serialize)]
struct DecisionOutput {
    action: &'static str,
    #[serde(rename = "nextIndex")]
    next_index: usize,
    #[serde(rename = "difficultyDelta")]
    difficulty_delta: i8,
    #[serde(rename = "interestAnchorPresent")]
    interest_anchor_present: bool,
    #[serde(rename = "mettaQuery")]
    metta_query: String,
    source: &'static str,
}

fn main() -> std::io::Result<()> {
    let bind = env::var("SYNC_SENTA_ADAPTIVE_BIND").unwrap_or_else(|_| "127.0.0.1:8091".into());
    let listener = TcpListener::bind(&bind)?;
    eprintln!("syncsenta adaptive service listening on {bind}");
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                if let Err(error) = handle_connection(stream) {
                    eprintln!("adaptive connection error: {error}");
                }
            }
            Err(error) => eprintln!("adaptive accept error: {error}"),
        }
    }
    Ok(())
}

fn handle_connection(mut stream: TcpStream) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let mut header_end = None;
    let mut expected_body = 0_usize;
    loop {
        let read = stream.read(&mut chunk)?;
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..read]);
        if buffer.len() > MAX_BODY_BYTES + 4096 {
            return write_response(&mut stream, 413, "{\"error\":\"request_too_large\"}");
        }
        if header_end.is_none() {
            if let Some(position) = buffer.windows(4).position(|window| window == b"\r\n\r\n") {
                let end = position + 4;
                header_end = Some(end);
                let headers = String::from_utf8_lossy(&buffer[..position]);
                expected_body = headers
                    .lines()
                    .find_map(|line| {
                        line.strip_prefix("Content-Length:")
                            .or_else(|| line.strip_prefix("content-length:"))
                    })
                    .and_then(|value| value.trim().parse().ok())
                    .unwrap_or(0);
                if expected_body > MAX_BODY_BYTES {
                    return write_response(&mut stream, 413, "{\"error\":\"request_too_large\"}");
                }
            }
        }
        if let Some(end) = header_end {
            if buffer.len() >= end + expected_body {
                break;
            }
        }
    }
    if buffer.len() > MAX_BODY_BYTES + 4096 {
        return write_response(&mut stream, 413, "{\"error\":\"request_too_large\"}");
    }
    let request = String::from_utf8_lossy(&buffer);
    let mut lines = request.split("\r\n");
    let request_line = lines.next().unwrap_or_default();
    if request_line == "GET /health HTTP/1.1" || request_line == "GET /health HTTP/1.0" {
        return write_response(
            &mut stream,
            200,
            "{\"status\":\"ok\",\"service\":\"syncsenta-adaptive\"}",
        );
    }
    if !request_line.starts_with("POST /v1/adaptive-question HTTP/") {
        return write_response(&mut stream, 404, "{\"error\":\"not_found\"}");
    }
    let separator = buffer.windows(4).position(|window| window == b"\r\n\r\n");
    let Some(separator) = separator else {
        return write_response(&mut stream, 400, "{\"error\":\"invalid_http_request\"}");
    };
    let body = &buffer[separator + 4..];
    if body.len() > MAX_BODY_BYTES {
        return write_response(&mut stream, 413, "{\"error\":\"request_too_large\"}");
    }
    let input: DecisionInput = match serde_json::from_slice(body) {
        Ok(input) => input,
        Err(_) => {
            return write_response(&mut stream, 400, "{\"error\":\"invalid_adaptive_input\"}")
        }
    };
    let decision = match choose_next_question(&AdaptiveQuestionRequest {
        lesson_id: input.lesson_id,
        grade: input.grade,
        subject: input.subject,
        competency: input.competency,
        current_index: input.current_index,
        total_questions: input.total_questions,
        attempt_count: input.attempt_count,
        correct_count: input.correct_count,
        hint_level: input.hint_level,
        last_correct: input.last_correct,
        interest: input.interest,
        mastery_threshold: input.mastery_threshold,
    }) {
        Ok(decision) => decision,
        Err(_) => {
            return write_response(&mut stream, 400, "{\"error\":\"invalid_adaptive_input\"}")
        }
    };
    let action = match decision.action {
        NextQuestionAction::Retry => "retry",
        NextQuestionAction::Advance => "advance",
        NextQuestionAction::Complete => "complete",
    };
    let output = DecisionOutput {
        action,
        next_index: decision.next_index,
        difficulty_delta: decision.difficulty_delta,
        interest_anchor_present: decision.interest_anchor_present,
        metta_query: decision.metta_query,
        source: "rust",
    };
    let body = serde_json::to_string(&output)
        .unwrap_or_else(|_| "{\"error\":\"serialization_error\"}".into());
    write_response(&mut stream, 200, &body)
}

fn write_response(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let status_text = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        413 => "Payload Too Large",
        _ => "Service Unavailable",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_rust_decision_shape() {
        let output = DecisionOutput {
            action: "advance",
            next_index: 1,
            difficulty_delta: 0,
            interest_anchor_present: true,
            metta_query: "!(syncsenta-next-question)".into(),
            source: "rust",
        };
        let json = serde_json::to_string(&output).unwrap();
        assert!(json.contains("\"action\":\"advance\""));
        assert!(json.contains("\"source\":\"rust\""));
    }
}

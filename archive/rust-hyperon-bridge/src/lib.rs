use hyperon::metta::runner::Metta;
use hyperon::metta::text::SExprParser;

const MAX_PROGRAM_BYTES: usize = 64 * 1024;
const MAX_QUERY_BYTES: usize = 1024;
const MAX_RESULTS: usize = 16;
const MAX_RESULT_BYTES: usize = 8 * 1024;
const SYNCSENTA_POLICY: &str = include_str!("../../metta-logic/syncsenta_policy.metta");

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HyperonBridgeError {
    ProgramTooLarge,
    EmptyProgram,
    Runtime(String),
    UnsafePolicyQuery,
    TooManyResults,
    ResultTooLarge,
}

impl std::fmt::Display for HyperonBridgeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ProgramTooLarge => write!(f, "program_too_large"),
            Self::EmptyProgram => write!(f, "empty_program"),
            Self::Runtime(message) => write!(f, "hyperon_runtime:{message}"),
            Self::UnsafePolicyQuery => write!(f, "unsafe_policy_query"),
            Self::TooManyResults => write!(f, "too_many_results"),
            Self::ResultTooLarge => write!(f, "result_too_large"),
        }
    }
}

impl std::error::Error for HyperonBridgeError {}

/// Runs a bounded MeTTa program in a fresh Hyperon interpreter.
///
/// This prototype intentionally does not expose learner content, network access,
/// or mutable cross-request state. Production integration must add an allowlist
/// for approved policy programs and preserve the Rust safety gate.
pub fn run_syncsenta_policy(query: &str) -> Result<Vec<Vec<String>>, HyperonBridgeError> {
    if query.len() > MAX_QUERY_BYTES
        || !query.trim_start().starts_with("!(")
        || query.contains(';')
        || query.contains('"')
        || query.contains('=')
        || query.contains('$')
        || query.contains('&')
    {
        return Err(HyperonBridgeError::UnsafePolicyQuery);
    }
    run_metta(&format!("{SYNCSENTA_POLICY} {query}"))
}

pub fn run_metta(program: &str) -> Result<Vec<Vec<String>>, HyperonBridgeError> {
    if program.trim().is_empty() {
        return Err(HyperonBridgeError::EmptyProgram);
    }
    if program.len() > MAX_PROGRAM_BYTES {
        return Err(HyperonBridgeError::ProgramTooLarge);
    }

    let metta = Metta::new(None);
    let results = metta
        .run(SExprParser::new(program))
        .map_err(HyperonBridgeError::Runtime)?;
    if results.len() > MAX_RESULTS {
        return Err(HyperonBridgeError::TooManyResults);
    }
    let output: Vec<Vec<String>> = results
        .into_iter()
        .map(|atoms| atoms.into_iter().map(|atom| atom.to_string()).collect())
        .collect();
    let output_bytes = output.iter().flatten().map(String::len).sum::<usize>();
    if output_bytes > MAX_RESULT_BYTES {
        return Err(HyperonBridgeError::ResultTooLarge);
    }
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn executes_simple_policy() {
        let result = run_metta("(= (route clear) Approved) !(route clear)").unwrap();
        assert_eq!(result, vec![vec!["Approved".to_string()]]);
    }

    #[test]
    fn rejects_empty_program() {
        assert_eq!(run_metta("  "), Err(HyperonBridgeError::EmptyProgram));
    }

    #[test]
    fn rejects_oversized_program() {
        let program = "x".repeat(MAX_PROGRAM_BYTES + 1);
        assert_eq!(
            run_metta(&program),
            Err(HyperonBridgeError::ProgramTooLarge)
        );
    }

    #[test]
    fn executes_syncsenta_policy_source() {
        let result = run_syncsenta_policy("!(safeguarding-route self-harm)").unwrap();
        assert_eq!(result, vec![vec!["(Review safeguarding)".to_string()]]);
    }

    #[test]
    fn rejects_non_policy_queries() {
        assert_eq!(
            run_syncsenta_policy("(= (unsafe) Approved)"),
            Err(HyperonBridgeError::UnsafePolicyQuery)
        );
        assert_eq!(
            run_syncsenta_policy("!(safeguarding-route $raw)"),
            Err(HyperonBridgeError::UnsafePolicyQuery)
        );
    }
}

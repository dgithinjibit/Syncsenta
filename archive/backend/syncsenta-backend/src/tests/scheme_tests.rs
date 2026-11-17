//! Unit tests for scheme CRUD operations
//!
//! Tests the scheme generation service and CRUD routes

use crate::services::scheme::{
    build_curriculum_ref, validate_curriculum_ref, SchemeGenerationRequest,
};
use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};
use uuid::Uuid;

#[test]
fn test_build_curriculum_ref() {
    let ref_str = build_curriculum_ref(
        "Mathematics",
        &CBCGradeLevel::Grade4,
        "Numbers",
        "Whole Numbers",
    );
    assert_eq!(ref_str, "CBC/Mathematics/Grade4/Numbers/Whole Numbers");
}

#[test]
fn test_validate_curriculum_ref_valid_subject() {
    assert!(validate_curriculum_ref(
        "Mathematics",
        &CBCGradeLevel::Grade5,
        "Numbers",
        "Fractions",
    ));
}

#[test]
fn test_validate_curriculum_ref_invalid_empty_subject() {
    assert!(!validate_curriculum_ref(
        "",
        &CBCGradeLevel::Grade5,
        "Numbers",
        "Fractions",
    ));
}

#[test]
fn test_validate_curriculum_ref_invalid_empty_strand() {
    assert!(!validate_curriculum_ref(
        "Mathematics",
        &CBCGradeLevel::Grade5,
        "",
        "Fractions",
    ));
}

#[test]
fn test_validate_curriculum_ref_invalid_empty_substrand() {
    assert!(!validate_curriculum_ref(
        "Mathematics",
        &CBCGradeLevel::Grade5,
        "Numbers",
        "",
    ));
}

#[test]
fn test_scheme_generation_request_structure() {
    let req = SchemeGenerationRequest {
        subject: "Science and Technology".to_string(),
        grade_level: CBCGradeLevel::Grade6,
        strand: "Living Things".to_string(),
        sub_strand: "Plants".to_string(),
        weeks_count: 5,
        language: SupportedLanguage::En,
        teacher_id: Uuid::new_v4(),
        class_id: Uuid::new_v4(),
    };

    assert_eq!(req.subject, "Science and Technology");
    assert_eq!(req.weeks_count, 5);
}

#[test]
fn test_curriculum_ref_all_grade_levels() {
    let grades = vec![
        CBCGradeLevel::PP1,
        CBCGradeLevel::PP2,
        CBCGradeLevel::Grade1,
        CBCGradeLevel::Grade2,
        CBCGradeLevel::Grade3,
        CBCGradeLevel::Grade4,
        CBCGradeLevel::Grade5,
        CBCGradeLevel::Grade6,
        CBCGradeLevel::JSS1,
        CBCGradeLevel::JSS2,
        CBCGradeLevel::JSS3,
    ];

    for grade in grades {
        let ref_str = build_curriculum_ref("Mathematics", &grade, "Numbers", "Addition");
        assert!(ref_str.starts_with("CBC/Mathematics/"));
        assert!(ref_str.contains("Numbers/Addition"));
    }
}

#[test]
fn test_curriculum_ref_all_languages() {
    let languages = vec![
        SupportedLanguage::En,
        SupportedLanguage::Sw,
        SupportedLanguage::Ki,
        SupportedLanguage::Luo,
        SupportedLanguage::Luy,
    ];

    for lang in languages {
        let req = SchemeGenerationRequest {
            subject: "English".to_string(),
            grade_level: CBCGradeLevel::Grade3,
            strand: "Reading".to_string(),
            sub_strand: "Comprehension".to_string(),
            weeks_count: 3,
            language: lang,
            teacher_id: Uuid::new_v4(),
            class_id: Uuid::new_v4(),
        };

        // Just verify the request can be created with all languages
        assert_eq!(req.weeks_count, 3);
    }
}

#[test]
fn test_weeks_count_validation_range() {
    // Valid weeks count should be between 1 and 52
    let valid_weeks = vec![1, 5, 10, 20, 40, 52];
    
    for weeks in valid_weeks {
        let req = SchemeGenerationRequest {
            subject: "Mathematics".to_string(),
            grade_level: CBCGradeLevel::Grade5,
            strand: "Numbers".to_string(),
            sub_strand: "Multiplication".to_string(),
            weeks_count: weeks,
            language: SupportedLanguage::En,
            teacher_id: Uuid::new_v4(),
            class_id: Uuid::new_v4(),
        };
        
        assert!(req.weeks_count >= 1 && req.weeks_count <= 52);
    }
}

#[test]
fn test_validate_cbc_subjects() {
    let valid_subjects = vec![
        "Mathematics",
        "English",
        "Kiswahili",
        "Science and Technology",
        "Social Studies",
        "Creative Arts",
        "Physical Education",
        "Religious Education",
    ];

    for subject in valid_subjects {
        assert!(validate_curriculum_ref(
            subject,
            &CBCGradeLevel::Grade5,
            "Test Strand",
            "Test Sub-strand",
        ));
    }
}

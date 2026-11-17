//! Provenance-aware retrieval boundary for Indigenous Language CBC material.
//! This module indexes approved source metadata; it does not invent translations.

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IndigenousSource {
    pub id: &'static str,
    pub grade: &'static str,
    pub language_label: &'static str,
    pub source_path: &'static str,
    pub approved: bool,
}

const SOURCES: &[IndigenousSource] = &[
    IndigenousSource {
        id: "kicd-grade1-indigenous-language",
        grade: "Grade 1",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade1/GRADE.1.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade2-indigenous-language",
        grade: "Grade 2",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade2/GRADE.2.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade3-indigenous-language",
        grade: "Grade 3",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade3/GRADE.3.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade4-indigenous-language",
        grade: "Grade 4",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade4/GRADE.4.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade5-indigenous-language",
        grade: "Grade 5",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade5/GRADE.5.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade6-indigenous-language",
        grade: "Grade 6",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade6/GRADE.6.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
    IndigenousSource {
        id: "kicd-grade7-indigenous-language",
        grade: "Grade 7",
        language_label: "unspecified community language",
        source_path: "studio/public/designs/grade7/GRADE.7.INDIGENOUS.LANGUAGE.pdf",
        approved: true,
    },
];

pub fn retrieve_sources(grade: &str, language_label: &str) -> Vec<&'static IndigenousSource> {
    SOURCES
        .iter()
        .filter(|source| {
            source.approved
                && source.grade.eq_ignore_ascii_case(grade)
                && (language_label.is_empty()
                    || source.language_label.eq_ignore_ascii_case(language_label))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::retrieve_sources;

    #[test]
    fn retrieves_only_provenanced_grade_source() {
        let records = retrieve_sources("Grade 5", "unspecified community language");
        assert_eq!(records.len(), 1);
        assert!(records[0]
            .source_path
            .ends_with("GRADE.5.INDIGENOUS.LANGUAGE.pdf"));
    }

    #[test]
    fn refuses_unknown_community_language_evidence() {
        assert!(retrieve_sources("Grade 5", "Turkana").is_empty());
    }
}

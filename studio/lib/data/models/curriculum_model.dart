
import 'package:ai_code_generation_example/domain/entities/curriculum.dart';

class CurriculumModel extends Curriculum {
  CurriculumModel({
    required String grade,
    required String subject,
    required List<StrandModel> strands,
  }) : super(grade: grade, subject: subject, strands: strands);

  factory CurriculumModel.fromJson(Map<String, dynamic> json) {
    return CurriculumModel(
      grade: json['grade'],
      subject: json['subject'],
      strands: (json['strands'] as List)
          .map((strand) => StrandModel.fromJson(strand))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'grade': grade,
      'subject': subject,
      'strands': (strands as List<StrandModel>)
          .map((strand) => strand.toJson())
          .toList(),
    };
  }
}

class StrandModel extends Strand {
  StrandModel({
    required String title,
    required List<SubStrandModel> subStrands,
  }) : super(title: title, subStrands: subStrands);

  factory StrandModel.fromJson(Map<String, dynamic> json) {
    return StrandModel(
      title: json['title'],
      subStrands: (json['sub_strands'] as List)
          .map((subStrand) => SubStrandModel.fromJson(subStrand))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'sub_strands': (subStrands as List<SubStrandModel>)
          .map((subStrand) => subStrand.toJson())
          .toList(),
    };
  }
}

class SubStrandModel extends SubStrand {
  SubStrandModel({
    required String title,
    required List<String> learningOutcomes,
  }) : super(title: title, learningOutcomes: learningOutcomes);

  factory SubStrandModel.fromJson(Map<String, dynamic> json) {
    return SubStrandModel(
      title: json['title'],
      learningOutcomes: List<String>.from(json['learning_outcomes']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'learning_outcomes': learningOutcomes,
    };
  }
}

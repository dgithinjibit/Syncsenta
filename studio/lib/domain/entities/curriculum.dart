
class Curriculum {
  final String grade;
  final String subject;
  final List<Strand> strands;

  Curriculum({
    required this.grade,
    required this.subject,
    required this.strands,
  });
}

class Strand {
  final String title;
  final List<SubStrand> subStrands;

  Strand({
    required this.title,
    required this.subStrands,
  });
}

class SubStrand {
  final String title;
  final List<String> learningOutcomes;

  SubStrand({
    required this.title,
    required this.learningOutcomes,
  });
}

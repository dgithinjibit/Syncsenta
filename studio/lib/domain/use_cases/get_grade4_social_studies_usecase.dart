
import 'package:ai_code_generation_example/domain/entities/curriculum.dart';
import 'package:ai_code_generation_example/domain/repositories/curriculum_repository.dart';

class GetGrade4SocialStudiesUseCase {
  final CurriculumRepository repository;

  GetGrade4SocialStudiesUseCase(this.repository);

  Future<Curriculum> call() {
    return repository.getGrade4SocialStudies();
  }
}

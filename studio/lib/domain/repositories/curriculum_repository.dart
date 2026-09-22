
import 'package:ai_code_generation_example/domain/entities/curriculum.dart';

// Abstract contract for the curriculum data source
abstract class CurriculumRepository {
  Future<Curriculum> getGrade4SocialStudies();
}

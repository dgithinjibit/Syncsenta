
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ai_code_generation_example/data/repositories/curriculum_repository_impl.dart';
import 'package:ai_code_generation_example/domain/entities/curriculum.dart';
import 'package:ai_code_generation_example/domain/use_cases/get_grade4_social_studies_usecase.dart';

class CurriculumScreen extends StatelessWidget {
  final GetGrade4SocialStudiesUseCase getCurriculumUseCase;

  CurriculumScreen({Key? key}) 
      : getCurriculumUseCase = GetGrade4SocialStudiesUseCase(
          CurriculumRepositoryImpl(FirebaseFirestore.instance),
        ), super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Grade 4 Social Studies'),
      ),
      body: FutureBuilder<Curriculum>(
        future: getCurriculumUseCase(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (!snapshot.hasData) {
            return Center(child: Text('No curriculum found.'));
          }

          final curriculum = snapshot.data!;

          return ListView.builder(
            itemCount: curriculum.strands.length,
            itemBuilder: (context, index) {
              final strand = curriculum.strands[index];
              return ExpansionTile(
                title: Text(strand.title, style: TextStyle(fontWeight: FontWeight.bold)),
                children: strand.subStrands.map((subStrand) {
                  return ExpansionTile(
                    title: Text(subStrand.title, style: TextStyle(fontStyle: FontStyle.italic)),
                    children: subStrand.learningOutcomes.map((outcome) {
                      return ListTile(
                        title: Text(outcome),
                        leading: Icon(Icons.check_circle_outline),
                      );
                    }).toList(),
                  );
                }).toList(),
              );
            },
          );
        },
      ),
    );
  }
}

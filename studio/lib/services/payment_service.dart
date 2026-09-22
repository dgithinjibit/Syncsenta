
import 'package:http/http.dart' as http;
import 'dart:convert';

class PaymentService {
  final String cloudFunctionUrl = 'YOUR_CLOUD_FUNCTION_URL_HERE'; // Replace with your actual URL

  Future<bool> processMpesaPayment({
    required String userId,
    required double amount,
    required String phoneNumber,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(cloudFunctionUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'userId': userId,
          'amount': amount,
          'phoneNumber': phoneNumber,
        }),
      );

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        return result['success'] == true;
      } else {
        // Handle non-200 responses
        print('Cloud Function Error: ${response.body}');
        return false;
      }
    } catch (e) {
      // Handle network errors
      print('Payment Service Error: $e');
      return false;
    }
  }
}

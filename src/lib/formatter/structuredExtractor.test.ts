import { describe, it, expect } from 'bun:test';
import type { ExtractionSchema } from './extractionSchema';
import type { ChunkExtractionResult } from './structuredExtractor';

// We need to test the parsing logic separately since it doesn't depend on the LLM backend
// The actual extraction would be tested with a mock backend

describe('Structured Extraction', () => {
  const mockSchema: ExtractionSchema = {
    name: 'PatientInfo',
    description: 'Extract patient information',
    fields: [
      { path: 'patient.name', type: 'string', description: 'Patient full name' },
      { path: 'patient.age', type: 'number', description: 'Patient age in years' },
      { path: 'diagnosis.primary', type: 'string', description: 'Primary diagnosis' },
      { path: 'medications', type: 'array', description: 'List of medications' },
      { path: 'isAdmitted', type: 'boolean', description: 'Whether patient is admitted' },
    ],
  };

  describe('parseExtractionResponse logic', () => {
    // Helper to simulate the parsing logic from structuredExtractor.ts
    function parseExtractionResponse(
      response: string,
      schema: ExtractionSchema
    ): Record<string, string | number | boolean | string[] | null> {
      const result: Record<string, string | number | boolean | string[] | null> = {};
      for (const field of schema.fields) {
        result[field.path] = null;
      }

      try {
        let jsonStr = response.trim();

        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }

        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }

        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr);

        for (const field of schema.fields) {
          const value = parsed[field.path];

          if (value === undefined || value === null) {
            result[field.path] = null;
          } else {
            switch (field.type) {
              case 'string':
                result[field.path] = value === null || value === undefined ? null : String(value);
                break;
              case 'number':
                if (typeof value === 'number') result[field.path] = value;
                else if (typeof value === 'string') {
                  const num = Number(value);
                  result[field.path] = isNaN(num) ? null : num;
                } else {
                  result[field.path] = null;
                }
                break;
              case 'boolean':
                if (typeof value === 'boolean') result[field.path] = value;
                else if (typeof value === 'string') {
                  const lower = value.toLowerCase();
                  result[field.path] = lower === 'true' ? true : lower === 'false' ? false : null;
                } else if (typeof value === 'number') {
                  result[field.path] = value !== 0;
                } else {
                  result[field.path] = null;
                }
                break;
              case 'date':
                result[field.path] = value === null || value === undefined ? null : String(value);
                break;
              case 'array':
                if (Array.isArray(value)) {
                  result[field.path] = value.map((v) => String(v));
                } else {
                  result[field.path] = null;
                }
                break;
              default:
                result[field.path] = value === null || value === undefined ? null : String(value);
            }
          }
        }
      } catch {
        // On parse failure, return all-null result
        return result;
      }

      return result;
    }

    it('should parse a valid JSON response', () => {
      const response = JSON.stringify({
        'patient.name': 'John Doe',
        'patient.age': 45,
        'diagnosis.primary': 'Hypertension',
        'medications': ['Aspirin', 'Lisinopril'],
        'isAdmitted': true,
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBe('John Doe');
      expect(result['patient.age']).toBe(45);
      expect(result['diagnosis.primary']).toBe('Hypertension');
      expect(result['medications']).toEqual(['Aspirin', 'Lisinopril']);
      expect(result['isAdmitted']).toBe(true);
    });

    it('should handle null values for missing fields', () => {
      const response = JSON.stringify({
        'patient.name': 'Jane Smith',
        // Missing: patient.age, diagnosis.primary, medications, isAdmitted
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBe('Jane Smith');
      expect(result['patient.age']).toBeNull();
      expect(result['diagnosis.primary']).toBeNull();
      expect(result['medications']).toBeNull();
      expect(result['isAdmitted']).toBeNull();
    });

    it('should coerce string numbers to numbers', () => {
      const response = JSON.stringify({
        'patient.name': 'Bob',
        'patient.age': '42', // String instead of number
        'diagnosis.primary': 'Diabetes',
        'medications': null,
        'isAdmitted': false,
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.age']).toBe(42);
      expect(result['patient.age']).toBeTypeOf('number');
    });

    it('should coerce boolean strings', () => {
      const response = JSON.stringify({
        'patient.name': 'Alice',
        'patient.age': null,
        'diagnosis.primary': 'None',
        'medications': null,
        'isAdmitted': 'true', // String instead of boolean
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['isAdmitted']).toBe(true);
      expect(result['isAdmitted']).toBeTypeOf('boolean');
    });

    it('should handle markdown code blocks', () => {
      const response = `
\`\`\`json
{
  "patient.name": "Charlie",
  "patient.age": 30,
  "diagnosis.primary": "Flu",
  "medications": ["Tamiflu"],
  "isAdmitted": false
}
\`\`\`
      `;

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBe('Charlie');
      expect(result['patient.age']).toBe(30);
      expect(result['diagnosis.primary']).toBe('Flu');
      expect(result['medications']).toEqual(['Tamiflu']);
      expect(result['isAdmitted']).toBe(false);
    });

    it('should return all-null on invalid JSON', () => {
      const response = 'This is not JSON at all';

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBeNull();
      expect(result['patient.age']).toBeNull();
      expect(result['diagnosis.primary']).toBeNull();
      expect(result['medications']).toBeNull();
      expect(result['isAdmitted']).toBeNull();
    });

    it('should return all-null on incomplete JSON', () => {
      const response = '{"patient.name": "Incomplete';

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBeNull();
      expect(result['patient.age']).toBeNull();
    });

    it('should coerce array items to strings', () => {
      const response = JSON.stringify({
        'patient.name': 'Dave',
        'patient.age': 55,
        'diagnosis.primary': 'Arthritis',
        'medications': [1, 2, 3], // Numbers instead of strings
        'isAdmitted': true,
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['medications']).toEqual(['1', '2', '3']);
    });

    it('should handle empty array', () => {
      const response = JSON.stringify({
        'patient.name': 'Eve',
        'patient.age': 28,
        'diagnosis.primary': 'Healthy',
        'medications': [],
        'isAdmitted': false,
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['medications']).toEqual([]);
    });

    it('should handle mixed type coercion', () => {
      const response = JSON.stringify({
        'patient.name': 123, // Number instead of string
        'patient.age': 'not a number', // Invalid string number
        'diagnosis.primary': null,
        'medications': 'not an array',
        'isAdmitted': 'maybe', // Invalid boolean string
      });

      const result = parseExtractionResponse(response, mockSchema);

      expect(result['patient.name']).toBe('123'); // Coerced to string
      expect(result['patient.age']).toBeNull(); // Invalid number string
      expect(result['diagnosis.primary']).toBeNull();
      expect(result['medications']).toBeNull(); // Not an array
      expect(result['isAdmitted']).toBeNull(); // Invalid boolean string
    });
  });

  describe('ChunkExtractionResult structure', () => {
    it('should have correct structure', () => {
      const result: ChunkExtractionResult = {
        chunkIndex: 0,
        data: {
          'field1': 'value1',
          'field2': 42,
          'field3': true,
          'field4': ['a', 'b'],
          'field5': null,
        },
      };

      expect(result.chunkIndex).toBe(0);
      expect(result.data['field1']).toBe('value1');
      expect(result.data['field2']).toBe(42);
      expect(result.data['field3']).toBe(true);
      expect(result.data['field4']).toEqual(['a', 'b']);
      expect(result.data['field5']).toBeNull();
    });
  });
});

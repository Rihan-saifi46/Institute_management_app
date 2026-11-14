// ==============================================================================
// Z Institute Management System - Export Service & Component Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { escapeCsvField } from '../services/export';
import { DataExportModal } from '../components/common/DataExportModal';

describe('Data Portability & Export Service', () => {
  describe('escapeCsvField', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('returns raw string when no special CSV characters are present', () => {
      expect(escapeCsvField('Rihan')).toBe('Rihan');
      expect(escapeCsvField('Z1001')).toBe('Z1001');
      expect(escapeCsvField(4500)).toBe('4500');
    });

    it('escapes and quotes values containing commas', () => {
      expect(escapeCsvField('Full Stack, Web Development')).toBe('"Full Stack, Web Development"');
    });

    it('escapes double quotes by doubling them and wrapping in quotes', () => {
      expect(escapeCsvField('Batch "A" Special')).toBe('"Batch ""A"" Special"');
    });

    it('quotes values containing newline characters', () => {
      expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });
  });

  describe('DataExportModal Component', () => {
    it('is a valid React component function', () => {
      expect(typeof DataExportModal).toBe('function');
    });
  });
});


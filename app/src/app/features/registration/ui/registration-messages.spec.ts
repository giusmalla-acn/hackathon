import { getFieldDefinition } from '../data/registration-fields';
import { errorAnnouncement, errorMessages } from './registration-messages';

describe('registration messages', () => {
  const password = getFieldDefinition('password');
  const name = getFieldDefinition('name');

  describe('errorMessages', () => {
    it('says how many characters a short password has (spec §2.2)', () => {
      expect(errorMessages(password, ['PASSWORD_TOO_SHORT'], 'abc')).toEqual([
        'la password è troppo corta: hai scritto 3 caratteri, ne servono almeno 8.',
      ]);
    });

    it('uses the singular for one character', () => {
      expect(errorMessages(password, ['PASSWORD_TOO_SHORT'], 'a')[0]).toContain('hai scritto 1 carattere,');
    });

    it('counts code points, like the validator', () => {
      expect(errorMessages(password, ['PASSWORD_TOO_SHORT'], '😀😀')[0]).toContain('hai scritto 2 caratteri');
    });

    it.each([
      [['PASSWORD_MISSING_DIGIT'], 'la password è debole: aggiungi un numero.'],
      [['PASSWORD_MISSING_LOWER'], 'la password è debole: aggiungi una lettera.'],
      [['PASSWORD_MISSING_LOWER', 'PASSWORD_MISSING_DIGIT'], 'la password è debole: aggiungi una lettera e un numero.'],
    ] as const)('joins the weak-password codes %j into one message', (codes, message) => {
      expect(errorMessages(password, codes, '--------')).toEqual([message]);
    });

    it('keeps the order of the codes', () => {
      expect(errorMessages(name, ['NAME_INVALID_CHARS', 'NAME_TOO_SHORT'], 'A1')).toEqual([
        name.errorMessages.NAME_INVALID_CHARS,
        name.errorMessages.NAME_TOO_SHORT,
      ]);
    });

    it('falls back to a generic message for a code without text', () => {
      expect(errorMessages(name, ['EMAIL_MISSING_AT'], 'x')).toEqual(['il valore non è valido.']);
    });
  });

  describe('errorAnnouncement', () => {
    it('is null without errors', () => {
      expect(errorAnnouncement(password, [], 'Girasole42')).toBeNull();
    });

    it('reads a single error with the field name', () => {
      expect(errorAnnouncement(password, ['PASSWORD_MISSING_DIGIT'], 'abcdefgh')).toBe(
        'Errore nel campo Password: la password è debole: aggiungi un numero.',
      );
    });

    it('with more errors reads the count first, then only the first error', () => {
      expect(errorAnnouncement(password, ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_DIGIT'], 'abc')).toBe(
        '2 errori trovati. Errore nel campo Password: la password è troppo corta: hai scritto 3 caratteri, ne servono almeno 8.',
      );
    });

    it('counts the messages, not the codes, after joining the weak-password ones', () => {
      expect(
        errorAnnouncement(password, ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_LOWER', 'PASSWORD_MISSING_DIGIT'], '-'),
      ).toMatch(/^2 errori trovati\. Errore nel campo Password: la password è troppo corta/);
    });
  });
});

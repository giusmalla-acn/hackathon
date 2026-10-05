import type {
  AssistFieldContext,
  AssistRequest,
  AssistSkill,
  ExplanationStyle,
  FieldId,
  ValidationErrorCode,
} from './contract';

/**
 * Validazione manuale di `AssistRequest`. Ricostruisce l'oggetto con i soli campi del contratto:
 * qualunque proprietà in più (per esempio un valore digitato finito lì per errore) viene scartata.
 */
export class InvalidRequestError extends Error {
  constructor(readonly path: string) {
    super(`Richiesta di assistenza non valida: ${path}`);
    this.name = 'InvalidRequestError';
  }
}

const MAX_TEXT_LENGTH = 500;
const MAX_RULES = 10;

const SKILLS: readonly AssistSkill[] = ['explain', 'rephrase', 'example', 'error-hint', 'question'];
const STYLES: readonly ExplanationStyle[] = ['brief', 'detailed', 'simple'];
const FIELD_IDS: readonly FieldId[] = ['name', 'email', 'password'];
const ERROR_CODES: readonly ValidationErrorCode[] = [
  'REQUIRED',
  'NAME_TOO_SHORT',
  'NAME_INVALID_CHARS',
  'EMAIL_MISSING_AT',
  'EMAIL_INVALID_DOMAIN',
  'EMAIL_INVALID_FORMAT',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_MISSING_UPPER',
  'PASSWORD_MISSING_LOWER',
  'PASSWORD_MISSING_DIGIT',
  'PASSWORD_MISSING_SYMBOL',
];

export function validateAssistRequest(body: unknown): AssistRequest {
  const input = record(body, 'body');
  const skill = oneOf(input['skill'], SKILLS, 'skill');
  const field = fieldContext(input['field']);
  const style = input['style'] === undefined ? undefined : oneOf(input['style'], STYLES, 'style');
  const base = { field, ...(style ? { style } : {}) };

  switch (skill) {
    case 'explain':
    case 'example':
      return { ...base, skill };
    case 'rephrase':
      return { ...base, skill, previousText: text(input['previousText'], 'previousText') };
    case 'question':
      return { ...base, skill, question: text(input['question'], 'question') };
    case 'error-hint': {
      const codes = input['errorCodes'];
      if (!Array.isArray(codes) || codes.length === 0 || codes.length > ERROR_CODES.length) {
        throw new InvalidRequestError('errorCodes');
      }
      const [first, ...rest] = codes.map((code, i) => oneOf(code, ERROR_CODES, `errorCodes[${i}]`));
      return { ...base, skill, errorCodes: [first as ValidationErrorCode, ...rest] };
    }
  }
}

function fieldContext(value: unknown): AssistFieldContext {
  const field = record(value, 'field');
  const rules = field['rules'];
  if (!Array.isArray(rules) || rules.length > MAX_RULES) {
    throw new InvalidRequestError('field.rules');
  }
  const step = positiveInt(field['step'], 'field.step');
  const totalSteps = positiveInt(field['totalSteps'], 'field.totalSteps');
  if (step > totalSteps) {
    throw new InvalidRequestError('field.step');
  }
  return {
    fieldId: oneOf(field['fieldId'], FIELD_IDS, 'field.fieldId'),
    label: text(field['label'], 'field.label'),
    purpose: text(field['purpose'], 'field.purpose'),
    rules: rules.map((rule, i) => text(rule, `field.rules[${i}]`)),
    step,
    totalSteps,
  };
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidRequestError(path);
  }
  return value as Record<string, unknown>;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new InvalidRequestError(path);
  }
  return value as T;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > MAX_TEXT_LENGTH) {
    throw new InvalidRequestError(path);
  }
  return value;
}

function positiveInt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new InvalidRequestError(path);
  }
  return value;
}

import { canAdvance, fieldStepNumber, isFieldStep, nextStep, prevStep, WIZARD_STEPS } from './wizard.machine';

describe('wizard.machine', () => {
  it('nextStep follows welcome → name → email → password → summary → done and stops at done', () => {
    const visited = [WIZARD_STEPS[0]];
    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      visited.push(nextStep(visited[visited.length - 1]));
    }
    expect(visited).toEqual(['welcome', 'name', 'email', 'password', 'summary', 'done', 'done']);
  });

  it('prevStep walks back to welcome and stops there', () => {
    expect(prevStep('summary')).toBe('password');
    expect(prevStep('email')).toBe('name');
    expect(prevStep('name')).toBe('welcome');
    expect(prevStep('welcome')).toBe('welcome');
  });

  it('prevStep does not leave the terminal done step', () => {
    expect(prevStep('done')).toBe('done');
  });

  it('canAdvance is false with errors, true without, and never from done', () => {
    expect(canAdvance('email', ['EMAIL_MISSING_AT'])).toBe(false);
    expect(canAdvance('email', [])).toBe(true);
    expect(canAdvance('welcome', [])).toBe(true);
    expect(canAdvance('done', [])).toBe(false);
  });

  it('identifies field steps and their 1-based number', () => {
    expect(WIZARD_STEPS.filter(isFieldStep)).toEqual(['name', 'email', 'password']);
    expect(fieldStepNumber('name')).toBe(1);
    expect(fieldStepNumber('password')).toBe(3);
    expect(fieldStepNumber('summary')).toBeNull();
  });
});

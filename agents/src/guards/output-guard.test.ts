import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ASSIST_OUTPUT_MAX_LENGTH, OutputGuardError, guardOutput } from './output-guard';

function rejects(text: unknown, reason: OutputGuardError['reason']): void {
  assert.throws(() => guardOutput(text), (error) => error instanceof OutputGuardError && error.reason === reason);
}

describe('guardOutput', () => {
  it('approva e normalizza un testo valido', () => {
    assert.equal(guardOutput('  Scrivi il tuo nome,\n  per esempio Mario.  '), 'Scrivi il tuo nome, per esempio Mario.');
  });

  it('scarta testi non stringa, vuoti o troppo lunghi', () => {
    rejects(undefined, 'not-string');
    rejects(42, 'not-string');
    rejects('   \n ', 'empty');
    rejects('a'.repeat(ASSIST_OUTPUT_MAX_LENGTH + 1), 'too-long');
    assert.equal(guardOutput('a'.repeat(ASSIST_OUTPUT_MAX_LENGTH)).length, ASSIST_OUTPUT_MAX_LENGTH);
  });

  it('scarta caratteri non stampabili', () => {
    rejects('Ciao\u0007', 'unsafe');
    rejects('Ciao​mondo', 'unsafe');
    rejects('Ciao‮mondo', 'unsafe');
  });

  it('scarta URL e domini', () => {
    rejects('Vai su https://esempio.it', 'unsafe');
    rejects('Apri www.esempio', 'unsafe');
    rejects('Visita esempio.com/aiuto', 'unsafe');
    rejects('javascript:alert(1)', 'unsafe');
  });

  it('scarta indirizzi email', () => {
    rejects('Per esempio mario.rossi@esempio.it', 'unsafe');
    rejects('Scrivi nome @ dominio', 'unsafe');
  });

  it('accetta la chiocciola descritta a parole', () => {
    assert.ok(guardOutput('Scrivi un nome, poi la chiocciola, poi il dominio con il punto.'));
  });
});

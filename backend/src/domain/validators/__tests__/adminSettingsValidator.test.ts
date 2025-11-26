import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminSettingsSchema } from '../adminSettingsValidator';
import { defaultAdminSettings } from '../../../config/adminSettingsDefaults';

test('AdminSettingsSchema acepta la configuración por defecto', () => {
  const result = AdminSettingsSchema.safeParse(defaultAdminSettings);
  assert.equal(result.success, true);
});

test('AdminSettingsSchema rechaza timeouts inválidos', () => {
  const invalid = JSON.parse(JSON.stringify(defaultAdminSettings)) as typeof defaultAdminSettings;
  invalid.timeoutConfig.deepResearch = -500;

  const result = AdminSettingsSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test('AdminSettingsSchema valida el rango de temperaturas', () => {
  const invalid = JSON.parse(JSON.stringify(defaultAdminSettings)) as typeof defaultAdminSettings;
  invalid.temperatureConfig.clientResearchTemp = 1.5;

  const result = AdminSettingsSchema.safeParse(invalid);
  assert.equal(result.success, false);
});


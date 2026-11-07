// Класифікатор дій для runtime-етапів 2-4 (WP7).
// Політика: tools/action-policy.json + опційний allowlist модуля tools/action-policy.<module>.json.
// Класи: safe | safe-close | dangerous | dangerous-adjacent | unknown.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CLICKABLE = new Set(['safe', 'safe-close']);

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Збіг з початку слова: "підтверд" ловить "Підтвердити", але не "Непідтверджені".
function wordStart(name, fragment) {
  const esc = fragment.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}`, 'u').test(name);
}

function sameElement(rule, el) {
  if (rule.role && rule.role !== el.role) return false;
  if (rule.name !== undefined && norm(rule.name) !== norm(el.name)) return false;
  if (rule.namePattern && !new RegExp(rule.namePattern, 'iu').test(el.name || '')) return false;
  return true;
}

export function loadPolicy({ module, policyFile, moduleFile } = {}) {
  const base = JSON.parse(readFileSync(policyFile || path.join(TOOLS, 'action-policy.json'), 'utf8'));
  const modPath = moduleFile || (module ? path.join(TOOLS, `action-policy.${module}.json`) : null);
  const mod = modPath && existsSync(modPath) ? JSON.parse(readFileSync(modPath, 'utf8')) : { allow: [], deny: [] };
  return { ...base, module: module || null, allow: mod.allow || [], deny: mod.deny || [] };
}

/**
 * @param {{role?:string,name?:string,type?:string,hasPopup?:boolean,expanded?:boolean|null,controls?:boolean}} el
 * @returns {{cls:string, rule:string}}
 */
export function classify(policy, el) {
  const name = norm(el.name);
  const deny = policy.deny.find((r) => sameElement(r, el));
  if (deny) return { cls: 'dangerous', rule: `module-deny:${deny.name || deny.namePattern}` };
  const allow = policy.allow.find((r) => sameElement(r, el));
  if (allow) return { cls: allow.class || 'safe', rule: `module-allow:${allow.name || allow.namePattern}` };

  if (policy.safeCloseExact.map(norm).includes(name)) return { cls: 'safe-close', rule: 'safeCloseExact' };
  const d = policy.dangerous.find((f) => wordStart(name, f));
  if (d) return { cls: 'dangerous', rule: `dangerous:${d}` };
  // type=submit небезпечний лише всередині форми; inForm=undefined (невідомо) - консервативно небезпечний.
  if (el.type && policy.dangerousTypes.includes(String(el.type).toLowerCase()) && el.inForm !== false) {
    return { cls: 'dangerous', rule: `type:${el.type}` };
  }
  const a = policy.dangerousAdjacent.find((f) => wordStart(name, f));
  if (a) return { cls: 'dangerous-adjacent', rule: `adjacent:${a}` };

  if (policy.safeRoles.includes(el.role)) return { cls: 'safe', rule: `role:${el.role}` };
  if (policy.safeWhenPopupTrigger && (el.hasPopup || el.expanded === true || el.expanded === false || el.controls)) {
    return { cls: 'safe', rule: 'popup-trigger' };
  }
  if (policy.safeNames.some((f) => wordStart(name, f))) return { cls: 'safe', rule: 'safeNames' };
  return { cls: 'unknown', rule: 'no-match' };
}

/** Чи є явне схвалення людини на конкретний елемент у конкретному стані. */
export function isApproved(approvals, el, stateLabel) {
  return (approvals || []).some(
    (a) => a.decision === 'approved' && a.role === el.role && norm(a.name) === norm(el.name) && (!a.state || a.state === stateLabel),
  );
}

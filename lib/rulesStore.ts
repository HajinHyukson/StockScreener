// /lib/rulesStore.ts
import { RuleAST } from './types';

export type Rule = {
  id: string;              // unique id
  name: string;
  ast: RuleAST;
  createdAt: string;
  updatedAt: string;
};

const RULES: Record<string, Rule> = {};

export function listRules(): Rule[] {
  return Object.values(RULES);
}

export function getRule(id: string): Rule | undefined {
  return RULES[id];
}

export function createRule(name: string, ast: RuleAST): Rule {
  const id = Math.random().toString(36).slice(2, 9);
  const now = new Date().toISOString();
  const rule: Rule = { id, name, ast, createdAt: now, updatedAt: now };
  RULES[id] = rule;
  return rule;
}

export function updateRule(id: string, name: string, ast: RuleAST): Rule | undefined {
  const existing = RULES[id];
  if (!existing) return undefined;
  const now = new Date().toISOString();
  const updated: Rule = { ...existing, name, ast, updatedAt: now };
  RULES[id] = updated;
  return updated;
}

export function deleteRule(id: string): boolean {
  return delete RULES[id];
}

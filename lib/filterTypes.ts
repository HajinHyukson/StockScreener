import type { RuleAST } from './types';

export type FilterGroup = 'always' | 'fundamental' | 'technical';

export type FilterModule = {
  /** Unique ID, also used as the key in state; for “combo” filters use ids like 'base.marketCap', 'ti.rsi' */
  id: string;
  label: string;               // UI label (e.g., "Exchange", "RSI")
  group: FilterGroup;          // where it belongs

  /** Renders the filter’s UI */
  Component: React.FC<{
    value: any;
    onChange: (v: any) => void;
  }>;

  /** Convert current UI state to 0+ AST nodes (omit when not set) */
  toAST: (value: any) => RuleAST[];

  /** Read AST nodes back into UI state (for saved rules) */
  fromAST: (ast: RuleAST) => any;

  /** Build key/value summary for "View Rule" */
  summarize?: (value: any) => Record<string, string>;
};

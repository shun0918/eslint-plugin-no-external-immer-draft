import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from "../src/rules/no-external-immer-draft";

const ruleTester = new RuleTester();

ruleTester.run("no-external-immer-draft", rule, {
  valid: [
    {
      code: `
        import { produce } from "immer";
        const state = { value: 0 };
        const newState = produce(state, draft => {
          draft.value = 1; // ✅ Operations within draft are allowed
        });
      `,
    },
    {
      code: `
        const x = { count: 0 };
        x.count = 1; // Operations outside produce are allowed
      `,
    },
    {
      code: `
        // Non-immer produce function should not trigger the rule
        import { produce } from "other-library";
        const external = { x: 1 };
        const result = produce({}, draft => {
          external.x = 2; // Should be allowed - not immer's produce
        });
      `,
    },
    {
      code: `
        // Local produce function should not trigger the rule
        function produce(state, updater) {
          return updater(state);
        }
        const external = { x: 1 };
        const result = produce({}, draft => {
          external.x = 2; // Should be allowed - not immer's produce
        });
      `,
    },
    {
      code: `
        // No immer import - should not trigger the rule
        const external = { x: 1 };
        const result = produce({}, draft => {
          external.x = 2; // Should be allowed - no immer import
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { produce } from "immer";
        const external = { x: 1 };
        const next = produce({}, draft => {
          external.x = 2; // ❌ External variable mutation
        });
      `,
      errors: [{ messageId: "externalMutation" }],
    },
  ],
});

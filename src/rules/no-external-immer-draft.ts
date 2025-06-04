import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(name => `https://example.com/rule/${name}`);

export default createRule({
  name: "no-external-immer-draft",
  meta: {
    type: "problem",
    docs: {
      description: "Avoid mutating external objects inside produce()",
    },
    messages: {
      externalMutation: "Avoid mutating variables outside of produce's draft scope.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const produceCallbacks: {
      node: TSESTree.CallExpression;
      draftParam?: string;
    }[] = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect produce function calls
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "produce" &&
          node.arguments.length >= 2
        ) {
          const callback = node.arguments[1];
          if (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression") {
            const draftParam = callback.params[0];
            const draftParamName = draftParam?.type === "Identifier" ? draftParam.name : undefined;
            produceCallbacks.push({
              node,
              draftParam: draftParamName,
            });
          }
        }
      },

      "CallExpression:exit"(node: TSESTree.CallExpression) {
        // Remove from stack when exiting produce callback
        const index = produceCallbacks.findIndex(cb => cb.node === node);
        if (index !== -1) {
          produceCallbacks.splice(index, 1);
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check if we're inside a produce callback
        if (produceCallbacks.length === 0) return;

        const currentCallback = produceCallbacks[produceCallbacks.length - 1];

        // Report error if assignment target is not the draft parameter
        if (node.left.type === "MemberExpression") {
          const object = node.left.object;
          if (object.type === "Identifier") {
            // Check assignments to variables other than the draft parameter
            if (currentCallback.draftParam && object.name !== currentCallback.draftParam) {
              context.report({
                node,
                messageId: "externalMutation",
              });
            }
          }
        }
      },
    };
  },
});

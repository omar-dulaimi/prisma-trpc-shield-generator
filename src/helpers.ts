export const getImports = (type: 'trpc' | 'trpc-shield') => {
  const trpcImportStatement = "import * as trpc from '@trpc/server';\n";
  const trpcShieldImportStatement =
    "import { shield, allow } from 'trpc-shield';\n";
  return type === 'trpc' ? trpcImportStatement : trpcShieldImportStatement;
};

export const wrapWithObject = ({
  shieldItemLines,
}: {
  shieldItemLines: Array<string> | string;
}) => {
  let wrapped = '{';
  wrapped += '\n';
  wrapped += Array.isArray(shieldItemLines)
    ? '  ' + shieldItemLines.join(',\r\n')
    : '  ' + shieldItemLines;
  wrapped += '\n';
  wrapped += '}';
  return wrapped;
};

export const wrapWithTrpcShieldCall = ({
  shieldObjectTextWrapped,
}: {
  shieldObjectTextWrapped: string;
}) => {
  let wrapped = 'shield(';
  wrapped += '\n';
  wrapped += '  ' + shieldObjectTextWrapped;
  wrapped += '\n';
  wrapped += ')';
  return wrapped;
};

export const wrapWithExport = ({
  shieldObjectText,
}: {
  shieldObjectText: string;
}) => {
  return `export const permissions = ${shieldObjectText};`;
};

export const constructShield = ({
  queries,
  mutations,
  subscriptions,
}: {
  queries: Array<string>;
  mutations: Array<string>;
  subscriptions: Array<string>;
}) => {
  if (
    queries.length === 0 &&
    mutations.length === 0 &&
    subscriptions.length === 0
  ) {
    return '';
  }

  let rootItems = '';
  if (queries.length > 0) {
    const queryLinesWrapped = `query: ${wrapWithObject({
      shieldItemLines: queries.map((query) => `${query}: allow`),
    })},`;
    rootItems += queryLinesWrapped;
  }
  if (mutations.length > 0) {
    const mutationLinesWrapped = `mutation: ${wrapWithObject({
      shieldItemLines: mutations.map((mutation) => `${mutation}: allow`),
    })},`;
    rootItems += mutationLinesWrapped;
  }

  if (subscriptions.length > 0) {
    const subscriptionLinesWrapped = `subscription: ${wrapWithObject({
      shieldItemLines: subscriptions.map(
        (subscription) => `${subscription}: allow`,
      ),
    })},`;
    rootItems += subscriptionLinesWrapped;
  }

  if (rootItems.length === 0) return '';
  let shieldText = getImports('trpc-shield');
  shieldText += '\n\n';
  shieldText += wrapWithExport({
    shieldObjectText: wrapWithTrpcShieldCall({
      shieldObjectTextWrapped: wrapWithObject({ shieldItemLines: rootItems }),
    }),
  });

  return shieldText;
};

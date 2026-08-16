import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="text-3xl font-bold mt-8 mb-4" {...p} />,
    h2: (p) => <h2 className="text-2xl font-semibold mt-8 mb-3" {...p} />,
    h3: (p) => <h3 className="text-xl font-semibold mt-6 mb-2" {...p} />,
    p: (p) => <p className="my-3 leading-7" {...p} />,
    ul: (p) => <ul className="list-disc pl-6 my-3 space-y-1" {...p} />,
    ol: (p) => <ol className="list-decimal pl-6 my-3 space-y-1" {...p} />,
    code: (p) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm" {...p} />
    ),
    pre: (p) => (
      <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100" {...p} />
    ),
    a: (p) => <a className="text-brand underline" {...p} />,
    ...components,
  };
}

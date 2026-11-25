"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LEGAL_DOCS, type LegalBlock, type LegalDocType } from "@pabom/core/domain/legal";
import { Segmented } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

const TAB_LABEL: Record<LegalDocType, string> = {
  terms: "이용약관",
  privacy: "개인정보 처리방침",
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "text":
      return <p>{block.text}</p>;
    case "subtitle":
      return <h3 className="pt-1 font-bold">{block.text}</h3>;
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "fields":
      return (
        <dl className="space-y-1.5">
          {block.items.map(({ label, value }) => (
            <div key={label}>
              <dt className="inline font-bold">
                {label}
                {block.colon ? ":" : ""}
              </dt>{" "}
              <dd className="inline">{value}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-body-md">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="px-2.5 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2.5 py-2 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return <p className="border-l-[3px] border-border pl-3 text-secondary-text">{block.text}</p>;
  }
}

function Blocks({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <div className="space-y-2.5 text-body-lg leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

export function TermsScreen() {
  const router = useRouter();
  const tab: LegalDocType = useSearchParams().get("tab") === "privacy" ? "privacy" : "terms";
  const doc = LEGAL_DOCS[tab];

  return (
    <Screen>
      <TopBar title={TAB_LABEL[tab]} fallbackHref="/settings" />
      <ScreenBody>
        <Segmented
          label="문서"
          options={[
            { value: "terms", label: TAB_LABEL.terms },
            { value: "privacy", label: TAB_LABEL.privacy },
          ]}
          value={tab}
          onChange={(next) => router.replace(next === "privacy" ? "/terms?tab=privacy" : "/terms")}
        />
        <h1 className="mt-5 text-title-xs">{doc.title}</h1>
        <p className="mt-1.5 text-body-md text-muted-foreground">{doc.meta}</p>
        <div className="mt-4">
          <Blocks blocks={doc.intro} />
        </div>
        <nav className="mt-4 rounded-md bg-muted p-3 text-body-lg">
          <p className="mb-1 font-bold">목차</p>
          {doc.sections.map((s, i) => (
            <a key={s.title} href={`#sec-${i}`} className="block py-0.5 text-primary">
              {s.title}
            </a>
          ))}
        </nav>
        {doc.sections.map((s, i) => (
          <section key={s.title} id={`sec-${i}`} className="mt-6 scroll-mt-4">
            <h2 className="mb-2.5 text-body-xl font-bold">{s.title}</h2>
            <Blocks blocks={s.blocks} />
          </section>
        ))}
        <div className="mt-6 border-t border-border pt-4">
          <Blocks blocks={doc.outro} />
        </div>
      </ScreenBody>
    </Screen>
  );
}

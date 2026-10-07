import React from "react";
import { Link, Text, useProductContext } from "@forge/react";
import type { Segment } from "../segments";

function href(segment: Segment, siteUrl: string | undefined): string | undefined {
  if (segment.href) return segment.href;
  if (!segment.accountId || !siteUrl) return undefined;
  // Account ids contain a colon, which Atlassian's own profile addresses leave unescaped.
  return `${siteUrl}/wiki/people/${encodeURIComponent(segment.accountId).replace(/%3A/gi, ":")}`;
}

export function Segments({ segments }: { segments: Segment[] }) {
  const siteUrl = useProductContext()?.siteUrl;

  return (
    <Text>
      {segments.map((segment, index) => {
        const target = href(segment, siteUrl);
        return target ? (
          <Link key={index} href={target} openNewTab>
            {segment.text}
          </Link>
        ) : (
          segment.text
        );
      })}
    </Text>
  );
}

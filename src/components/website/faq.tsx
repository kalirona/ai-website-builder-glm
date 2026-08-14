"use client"

import { HelpCircle } from "lucide-react"
import type { ComponentDefinition } from "@/lib/editor/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { rs } from "./responsive"

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  eyebrow: string
  heading: string
  items: FaqItem[]
}

export const FaqDef: ComponentDefinition<Props> = {
  type: "FAQ",
  name: "FAQ",
  icon: HelpCircle,
  category: "marketing",
  description: "Accordion FAQ section with expandable Q&A pairs.",
  defaultProps: {
    eyebrow: "FAQ",
    heading: "Frequently asked questions",
    items: [
      {
        question: "How does the free trial work?",
        answer:
          "You get full access to all features for 14 days. No credit card required. Cancel anytime before the trial ends.",
      },
      {
        question: "Can I change plans later?",
        answer:
          "Yes — you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately and we prorate the difference.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Absolutely. We use bank-grade encryption in transit and at rest, undergo regular security audits, and are GDPR compliant.",
      },
      {
        question: "Do you offer refunds?",
        answer:
          "We offer a 30-day money-back guarantee on all annual plans. If you're not happy, contact support for a full refund.",
      },
    ],
  },
  defaultStyles: {
    background: "var(--brand-background)",
    padding: { desktop: "96px", tablet: "64px", mobile: "48px" },
  },
  render: ({ node, props, styles, ctx }) => {
    const background = (styles.background as string) ?? "var(--brand-background)"
    const padding = rs(styles.padding, ctx.device, "96px")
    const items = (props.items as FaqItem[]) ?? []

    return (
      <section
        data-node={node.id}
        style={{
          background,
          width: "100%",
          paddingLeft: padding,
          paddingRight: padding,
          paddingTop: padding,
          paddingBottom: padding,
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--brand-primary)",
              }}
            >
              {props.eyebrow}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: ctx.device === "mobile" ? "30px" : "44px",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontWeight: 800,
                color: "var(--brand-foreground)",
                fontFamily: "var(--brand-heading-font)",
                maxWidth: "720px",
              }}
            >
              {props.heading}
            </h2>
          </div>

          {/* Accordion */}
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
            {items.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                style={{
                  borderBottom: "1px solid var(--brand-border)",
                }}
              >
                <AccordionTrigger
                  className="text-left hover:no-underline"
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "var(--brand-foreground)",
                    fontFamily: "var(--brand-heading-font)",
                    padding: "20px 4px",
                  }}
                >
                  {item.question}
                </AccordionTrigger>
                <AccordionContent
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "#475569",
                    fontFamily: "var(--brand-body-font)",
                    paddingBottom: 20,
                  }}
                >
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    )
  },
  settings: [
    { key: "props.eyebrow", label: "Eyebrow", group: "content", type: "text" },
    { key: "props.heading", label: "Heading", group: "content", type: "text" },
    {
      key: "props.items",
      label: "Q&A Items",
      group: "content",
      type: "list",
      itemFields: [
        { key: "question", label: "Question", type: "text" },
        { key: "answer", label: "Answer", type: "textarea" },
      ],
    },
    {
      key: "styles.background",
      label: "Background",
      group: "style",
      type: "color",
    },
    {
      key: "styles.padding",
      label: "Padding",
      group: "layout",
      type: "responsive-text",
      responsive: true,
    },
  ],
}

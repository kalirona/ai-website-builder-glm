"use client"

import type { ComponentDefinition } from "@/lib/editor/types"
import { registerComponent } from "@/lib/editor/registry"
import { SectionDef } from "./section"
import { ContainerDef } from "./container"
import { ColumnsDef } from "./columns"
import { HeadingDef } from "./heading"
import { TextDef } from "./text"
import { ButtonDef } from "./button"
import { ImageDef } from "./image"
import { VideoDef } from "./video"
import { HeroDef } from "./hero"
import { FeaturesDef } from "./features"
import { TestimonialsDef } from "./testimonials"
import { CtaDef } from "./cta"
import { NavbarDef } from "./navbar"
import { FooterDef } from "./footer"
import { PricingDef } from "./pricing"
import { FaqDef } from "./faq"
import { LogoCloudDef } from "./logo-cloud"
import { DividerDef } from "./divider"
import { SpacerDef } from "./spacer"
import { StatDef } from "./stat"

const allComponents: ComponentDefinition[] = [
  // Layout
  SectionDef as unknown as ComponentDefinition,
  ContainerDef as unknown as ComponentDefinition,
  ColumnsDef as unknown as ComponentDefinition,
  // Content
  HeadingDef as unknown as ComponentDefinition,
  TextDef as unknown as ComponentDefinition,
  ButtonDef as unknown as ComponentDefinition,
  DividerDef as unknown as ComponentDefinition,
  SpacerDef as unknown as ComponentDefinition,
  // Media
  ImageDef as unknown as ComponentDefinition,
  VideoDef as unknown as ComponentDefinition,
  // Marketing
  HeroDef as unknown as ComponentDefinition,
  FeaturesDef as unknown as ComponentDefinition,
  TestimonialsDef as unknown as ComponentDefinition,
  CtaDef as unknown as ComponentDefinition,
  NavbarDef as unknown as ComponentDefinition,
  FooterDef as unknown as ComponentDefinition,
  PricingDef as unknown as ComponentDefinition,
  FaqDef as unknown as ComponentDefinition,
  LogoCloudDef as unknown as ComponentDefinition,
  StatDef as unknown as ComponentDefinition,
]

let registered = false
function ensureRegistered() {
  if (registered) return
  registered = true
  for (const def of allComponents) registerComponent(def)
}

// Register on module load (side-effect import populates the registry).
ensureRegistered()

export {
  SectionDef,
  ContainerDef,
  ColumnsDef,
  HeadingDef,
  TextDef,
  ButtonDef,
  ImageDef,
  VideoDef,
  HeroDef,
  FeaturesDef,
  TestimonialsDef,
  CtaDef,
  NavbarDef,
  FooterDef,
  PricingDef,
  FaqDef,
  LogoCloudDef,
  DividerDef,
  SpacerDef,
  StatDef,
}

export { pickIcon, iconNames } from "./icon-picker"

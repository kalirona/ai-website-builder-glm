"use client"

import type { ComponentDefinition } from "@/lib/editor/types"
import { registerComponent } from "@/lib/editor/registry"
import { SectionDef } from "./section"
import { ContainerDef } from "./container"
import { HeadingDef } from "./heading"
import { TextDef } from "./text"
import { ButtonDef } from "./button"
import { ImageDef } from "./image"
import { HeroDef } from "./hero"
import { FeaturesDef } from "./features"
import { TestimonialsDef } from "./testimonials"
import { CtaDef } from "./cta"
import { NavbarDef } from "./navbar"
import { FooterDef } from "./footer"

const allComponents: ComponentDefinition[] = [
  SectionDef as unknown as ComponentDefinition,
  ContainerDef as unknown as ComponentDefinition,
  HeadingDef as unknown as ComponentDefinition,
  TextDef as unknown as ComponentDefinition,
  ButtonDef as unknown as ComponentDefinition,
  ImageDef as unknown as ComponentDefinition,
  HeroDef as unknown as ComponentDefinition,
  FeaturesDef as unknown as ComponentDefinition,
  TestimonialsDef as unknown as ComponentDefinition,
  CtaDef as unknown as ComponentDefinition,
  NavbarDef as unknown as ComponentDefinition,
  FooterDef as unknown as ComponentDefinition,
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
  HeadingDef,
  TextDef,
  ButtonDef,
  ImageDef,
  HeroDef,
  FeaturesDef,
  TestimonialsDef,
  CtaDef,
  NavbarDef,
  FooterDef,
}

export { pickIcon, iconNames } from "./icon-picker"

export type CountryProps = { name: string }

export type ClickEntry = { name?: string; total: number; today?: number }
export type ClickData = { [alpha2: string]: ClickEntry }

export type Tier = {
  min: number
  max: number
  color: string
  label: string
  tag: string
}

export type TooltipState = {
  name: string
  count: number
  x: number
  y: number
}

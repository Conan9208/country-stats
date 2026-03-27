import { NextRequest } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DATA_PATH = join(process.cwd(), 'data', 'clicks.json')

type ClickData = {
  [alpha2: string]: {
    name: string
    total: number
    daily: { [date: string]: number }
  }
}

function readData(): ClickData {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeData(data: ClickData) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const data = readData()
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const { alpha2, name } = await request.json()
  if (!alpha2 || typeof alpha2 !== 'string') {
    return Response.json({ error: 'invalid alpha2' }, { status: 400 })
  }

  const data = readData()
  const date = today()

  if (!data[alpha2]) {
    data[alpha2] = { name: name ?? alpha2, total: 0, daily: {} }
  }

  data[alpha2].total += 1
  data[alpha2].daily[date] = (data[alpha2].daily[date] ?? 0) + 1

  writeData(data)
  return Response.json(data[alpha2])
}

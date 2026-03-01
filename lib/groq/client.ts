import Groq from 'groq-sdk'
import { requireEnv } from '../env.js'

const apiKey = requireEnv('GROQ_API_KEY')

export const groq = new Groq({
  apiKey,
})

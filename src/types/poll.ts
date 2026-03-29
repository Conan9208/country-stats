export interface PollQuestion {
  emoji: string
  text: string
}

export interface PollTodayResponse {
  date: string
  questionIdx: number
  question: PollQuestion
  results: Record<string, number>  // alpha2 → vote_count
  totalVotes: number
  myVote: string | null            // alpha2 or null
}

export interface PollVoteRequest {
  alpha2: string
  countryName: string
}

export interface PollVoteResponse {
  ok: boolean
  reason?: string
}

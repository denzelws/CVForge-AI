export function judgeUserAnswer(answer: string): { accepted: boolean; reason?: string } {
  const accepted = answer.trim().length > 0;
  return accepted ? { accepted } : { accepted, reason: "Answer is empty." };
}

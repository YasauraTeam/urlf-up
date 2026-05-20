export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password) {
  return (
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[a-zA-Z]/.test(password)
  )
}

export function isValidFullName(name) {
  const t = name.trim()
  return t.length >= 2 && t.length <= 120
}

export function isValidRoleType(role) {
  return ['visionary', 'builder', 'enabler'].includes(role)
}

export function parseAndDedupeSkills(raw) {
  return [
    ...new Set(
      raw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)
    ),
  ]
}

export function isValidSkillsList(skills) {
  return skills.length >= 1 && skills.length <= 50
}

export function isValidIdeaTitle(title) {
  const t = title.trim()
  return t.length >= 5 && t.length <= 200
}

export function isValidIndustry(industry) {
  const i = industry.trim()
  return i.length >= 2 && i.length <= 80
}

export function isValidProblemSolved(text) {
  const t = text.trim()
  return t.length >= 20 && t.length <= 5000
}

export function isValidRequiredSkills(skills) {
  return skills.length <= 30
}

import { icon } from './icons'

/**
 * Display an error in a named slot element.
 * Uses textContent — never innerHTML — to prevent XSS.
 */
export function showError(slotId, message) {
  const slot = document.getElementById(slotId)
  if (!slot) return
  slot.textContent = message
  slot.hidden = false
}

export function clearError(slotId) {
  const slot = document.getElementById(slotId)
  if (!slot) return
  slot.textContent = ''
  slot.hidden = true
}

/**
 * Toggle loading state via CSS class.
 * Always call in finally{} to guarantee the button is re-enabled.
 */
export function setLoading(btn, loading) {
  if (!btn) return
  btn.disabled = loading
  btn.classList.toggle('btn--loading', loading)
}

// Active toast stack for FIFO eviction
const _activeToasts = []

function _dismissToast(toast) {
  toast.classList.remove('toast--visible')
  toast.addEventListener('transitionend', () => {
    toast.remove()
    const idx = _activeToasts.indexOf(toast)
    if (idx !== -1) _activeToasts.splice(idx, 1)
  }, { once: true })
}

/**
 * Show a transient toast.
 * Accepts: showToast(message, type) OR showToast({message, icon?, action?, type?})
 * Types: 'success' | 'error' | 'info'
 * Action: { label: string, onClick: () => void } — auto-focused, no auto-dismiss.
 */
export function showToast(msgOrOpts, typeArg = 'success') {
  const opts = typeof msgOrOpts === 'string'
    ? { message: msgOrOpts, type: typeArg }
    : msgOrOpts
  const { message, icon: iconName, action, type = 'success' } = opts

  const container = document.getElementById('toast-container')
  if (!container) return

  // FIFO eviction: max 3 toasts
  if (_activeToasts.length >= 3) {
    _dismissToast(_activeToasts[0])
  }

  const toast = document.createElement('div')
  toast.className = `toast toast--${type}`
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status')

  // Optional icon
  if (iconName) {
    try {
      const iconEl = icon(iconName, { size: 16, className: 'toast-icon' })
      toast.appendChild(iconEl)
    } catch {}
  }

  const msgEl = document.createElement('span')
  msgEl.className = 'toast-msg'
  msgEl.textContent = message
  toast.appendChild(msgEl)

  let actionBtn = null
  if (action) {
    actionBtn = document.createElement('button')
    actionBtn.type = 'button'
    actionBtn.className = 'toast-action'
    actionBtn.textContent = action.label
    actionBtn.addEventListener('click', () => {
      action.onClick()
      _dismissToast(toast)
    }, { once: true })
    toast.appendChild(actionBtn)
  }

  container.appendChild(toast)
  _activeToasts.push(toast)

  // Double rAF ensures the transition fires after paint
  requestAnimationFrame(() =>
    requestAnimationFrame(() => toast.classList.add('toast--visible'))
  )

  // Auto-focus action button (keyboard-accessible)
  if (actionBtn) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => actionBtn.focus())
    )
  }

  // Auto-dismiss: never if action; 6500ms error; 4000ms success/info
  if (!action) {
    const delay = type === 'error' ? 6500 : 4000
    setTimeout(() => _dismissToast(toast), delay)
  }
}

/**
 * Leading-edge throttle: fires immediately, then blocks for `ms` ms.
 * Prevents double-submit while keeping instant UX feedback.
 */
export function debounce(fn, ms) {
  let locked = false
  return function (...args) {
    if (locked) return
    locked = true
    setTimeout(() => { locked = false }, ms)
    return fn.apply(this, args)
  }
}

export function openModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  modal.setAttribute('aria-hidden', 'false')
  modal.classList.add('modal--open')
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    const first = modal.querySelector('input, select, textarea')
    if (first) first.focus()
  })
}

export function closeModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  modal.setAttribute('aria-hidden', 'true')
  modal.classList.remove('modal--open')
  document.body.style.overflow = ''
}

/**
 * Build an idea card using only createElement + textContent.
 * No innerHTML anywhere — XSS-safe.
 */
export function buildIdeaCard(idea) {
  const card = document.createElement('div')
  card.className = 'idea-card reveal'

  const chip = document.createElement('span')
  chip.className = 'idea-chip'
  chip.textContent = idea.industry || ''

  const title = document.createElement('h3')
  title.className = 'idea-title'
  title.textContent = idea.title || ''

  const problem = document.createElement('p')
  problem.className = 'idea-problem'
  problem.textContent = idea.problem_solved || ''

  card.appendChild(chip)
  card.appendChild(title)
  card.appendChild(problem)

  const skills = Array.isArray(idea.required_skills) ? idea.required_skills : []
  if (skills.length) {
    const wrap = document.createElement('div')
    wrap.className = 'idea-skills'
    skills.forEach(s => {
      const tag = document.createElement('span')
      tag.className = 'skill-tag'
      tag.textContent = s
      wrap.appendChild(tag)
    })
    card.appendChild(wrap)
  }

  return card
}

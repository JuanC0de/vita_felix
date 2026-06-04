import { describe, expect, it } from 'vitest'
import { isOpenForRegistration, isTransitionAllowed, nextStatus } from './event-status'
import type { EventStatus, StatusAction } from '../../app/types/events'

describe('event-status: transiciones permitidas', () => {
  const allowed: Array<[EventStatus, StatusAction, EventStatus]> = [
    ['draft', 'publish', 'published'],
    ['draft', 'cancel', 'cancelled'],
    ['published', 'finish', 'finished'],
    ['published', 'cancel', 'cancelled'],
  ]

  it.each(allowed)('%s + %s → %s', (current, action, expected) => {
    expect(nextStatus(current, action)).toBe(expected)
    expect(isTransitionAllowed(current, action)).toBe(true)
  })
})

describe('event-status: transiciones denegadas', () => {
  const denied: Array<[EventStatus, StatusAction]> = [
    ['draft', 'finish'],
    ['published', 'publish'],
    ['finished', 'publish'],
    ['finished', 'cancel'],
    ['finished', 'finish'],
    ['cancelled', 'publish'],
    ['cancelled', 'finish'],
    ['cancelled', 'cancel'],
  ]

  it.each(denied)('%s + %s → null', (current, action) => {
    expect(nextStatus(current, action)).toBeNull()
    expect(isTransitionAllowed(current, action)).toBe(false)
  })
})

describe('event-status: apertura al registro', () => {
  it('solo published está abierto al registro', () => {
    expect(isOpenForRegistration('published')).toBe(true)
    expect(isOpenForRegistration('draft')).toBe(false)
    expect(isOpenForRegistration('finished')).toBe(false)
    expect(isOpenForRegistration('cancelled')).toBe(false)
  })
})

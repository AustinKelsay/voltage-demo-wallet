/**
 * Simple event bus for application-wide events
 * Used to communicate between components that are not directly related
 */

type EventCallback = (...args: unknown[]) => void;

// Events we support in the app
export type AppEvent = 'transaction:new' | 'invoice:created' | 'payment:sent';

class EventBus {
  private events: Map<AppEvent, EventCallback[]>;

  constructor() {
    this.events = new Map();
  }

  // Subscribe to an event
  on(event: AppEvent, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);
  }

  // Unsubscribe from an event
  off(event: AppEvent, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  // Emit an event with arguments
  emit(event: AppEvent, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

// Create a singleton instance
const eventBus = new EventBus();

export default eventBus; 
/**
 * Inventory Manager — tracks items, equipment, usage
 */
import { Item, EquipmentSlots } from './types';
import { notify } from './notifications';

export class InventoryManager {
  items: Item[] = [];
  equipment: EquipmentSlots = { weapon: null, armor: null, accessory: null };

  addItem(item: Item): boolean {
    const existing = this.items.find(i => i.id === item.id && i.stackable);
    if (existing) {
      if (existing.quantity + item.quantity <= existing.maxStack) {
        existing.quantity += item.quantity;
        notify('loot', 'Item Acquired', `${item.name} x${item.quantity}`, item.icon);
        return true;
      }
      return false; // stack full
    }
    this.items.push({ ...item });
    notify('loot', 'Item Acquired', `${item.icon} ${item.name}`, item.icon);
    return true;
  }

  removeItem(itemId: string, qty = 1): boolean {
    const idx = this.items.findIndex(i => i.id === itemId);
    if (idx < 0) return false;
    this.items[idx].quantity -= qty;
    if (this.items[idx].quantity <= 0) {
      // unequip if equipped
      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        if (this.equipment[slot]?.id === itemId) this.equipment[slot] = null;
      }
      this.items.splice(idx, 1);
    }
    return true;
  }

  hasItem(itemId: string): boolean {
    return this.items.some(i => i.id === itemId && i.quantity > 0);
  }

  useItem(itemId: string): { healed?: number; effect?: string } | null {
    const item = this.items.find(i => i.id === itemId);
    if (!item || !item.usable) return null;

    const result: { healed?: number; effect?: string } = {};

    if (item.type === 'potion' && item.stats?.heal) {
      result.healed = item.stats.heal;
      result.effect = `Healed ${item.stats.heal} HP`;
    }

    this.removeItem(itemId, 1);
    return result;
  }

  equipItem(itemId: string): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item || !item.equippable || !item.slot) return false;

    // unequip current
    if (this.equipment[item.slot]) {
      // current stays in inventory but unequipped
    }
    this.equipment[item.slot] = item;
    notify('info', 'Equipped', `${item.icon} ${item.name}`, item.icon);
    return true;
  }

  unequipSlot(slot: 'weapon' | 'armor' | 'accessory') {
    this.equipment[slot] = null;
  }

  getWeaponDamage(): number {
    return this.equipment.weapon?.stats?.damage || 20;
  }

  getArmorDefense(): number {
    return this.equipment.armor?.stats?.defense || 0;
  }

  serialize(): { items: Item[]; equipment: EquipmentSlots } {
    return {
      items: this.items.map(i => ({ ...i })),
      equipment: {
        weapon: this.equipment.weapon ? { ...this.equipment.weapon } : null,
        armor: this.equipment.armor ? { ...this.equipment.armor } : null,
        accessory: this.equipment.accessory ? { ...this.equipment.accessory } : null,
      },
    };
  }

  load(data: { items: Item[]; equipment: EquipmentSlots }) {
    this.items = data.items.map(i => ({ ...i }));
    this.equipment = {
      weapon: data.equipment.weapon ? { ...data.equipment.weapon } : null,
      armor: data.equipment.armor ? { ...data.equipment.armor } : null,
      accessory: data.equipment.accessory ? { ...data.equipment.accessory } : null,
    };
  }
}

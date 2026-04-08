/**
 * Quest System — tracks objectives, progress, completion
 */
import { Quest, QuestObjective } from './types';
import { notify } from './notifications';

export class QuestManager {
  quests: Quest[] = [];

  addQuest(quest: Quest) {
    if (this.quests.find(q => q.id === quest.id)) return;
    this.quests.push({ ...quest, status: 'active' });
    notify('quest', 'New Quest', quest.name, '📜');
  }

  onKill(enemyType: string) {
    this.quests.forEach(q => {
      if (q.status !== 'active') return;
      q.objectives.forEach(obj => {
        if (obj.type === 'kill' && obj.targetId === enemyType && obj.currentCount < obj.requiredCount) {
          obj.currentCount++;
        }
      });
      this.checkCompletion(q);
    });
  }

  onCollect(itemId: string) {
    this.quests.forEach(q => {
      if (q.status !== 'active') return;
      q.objectives.forEach(obj => {
        if (obj.type === 'collect' && obj.targetId === itemId && obj.currentCount < obj.requiredCount) {
          obj.currentCount++;
        }
      });
      this.checkCompletion(q);
    });
  }

  private checkCompletion(quest: Quest) {
    const complete = quest.objectives.every(o => o.currentCount >= o.requiredCount);
    if (complete && quest.status === 'active') {
      quest.status = 'complete';
      notify('quest', 'Quest Complete! ✨', quest.name, '🏆');
    }
  }

  getActiveQuests(): Quest[] {
    return this.quests.filter(q => q.status === 'active');
  }

  getCompletedQuests(): Quest[] {
    return this.quests.filter(q => q.status === 'complete');
  }

  serialize(): Quest[] {
    return this.quests.map(q => ({
      ...q,
      objectives: q.objectives.map(o => ({ ...o })),
    }));
  }

  load(data: Quest[]) {
    this.quests = data.map(q => ({
      ...q,
      objectives: q.objectives.map(o => ({ ...o })),
    }));
  }
}

interface Template {
    id: string;
    name: string;
    icon: string;
    description: string;
    content: string;
}

const templates: Template[] = [
    {
        id: 'morning',
        name: 'Morning Pages',
        icon: '🌅',
        description: 'Start your day with intention',
        content: `# Morning Pages - ${new Date().toLocaleDateString()}

## How I'm feeling this morning
_Write freely about how you woke up feeling..._

## 3 Things I'm grateful for today
1. 
2. 
3. 

## My intention for today
> 

## What would make today great?
- 
- 
- 
`
    },
    {
        id: 'gratitude',
        name: 'Gratitude Journal',
        icon: '🙏',
        description: 'Focus on what you appreciate',
        content: `# Gratitude Entry

## 5 Things I'm grateful for today

1. **[Person/Relationship]**

2. **[Experience/Moment]**

3. **[Simple Pleasure]**

4. **[Opportunity]**

5. **[Personal Growth]**

## Why these matter to me
_Reflect on why you chose these..._

## One thing I often take for granted


`
    },
    {
        id: 'reflection',
        name: 'Daily Reflection',
        icon: '🌙',
        description: 'Review your day mindfully',
        content: `# Daily Reflection - ${new Date().toLocaleDateString()}

## What went well today?
- 
- 
- 

## What could have gone better?


## What did I learn today?


## One highlight of the day
> 

## Tomorrow I want to...

`
    },
    {
        id: 'weekly',
        name: 'Weekly Review',
        icon: '📅',
        description: 'Reflect on your week',
        content: `# Weekly Review

## This week's wins 🎉
1. 
2. 
3. 

## Challenges I faced
- 

## Lessons learned this week


## Goals for next week
1. 
2. 
3. 

## How I'll improve next week


## One word for this week:
> 
`
    },
    {
        id: 'goals',
        name: 'Goal Setting',
        icon: '🎯',
        description: 'Plan and track your goals',
        content: `# Goal Setting

## My Goal
> 

## Why this matters to me


## SMART Breakdown

**Specific:** What exactly do I want to achieve?


**Measurable:** How will I track progress?


**Achievable:** Is this realistic?


**Relevant:** Does this align with my values?


**Time-bound:** By when will I achieve this?


## First 3 steps to take
1. 
2. 
3. 

## Potential obstacles


## How I'll overcome them

`
    },
    {
        id: 'braindump',
        name: 'Brain Dump',
        icon: '🧠',
        description: 'Clear your mind freely',
        content: `# Brain Dump

*Write freely without judgment. Just get everything out of your head...*

---




---

## After writing, I noticed:


## Priority items to address:
- [ ] 
- [ ] 
- [ ] 
`
    },
    {
        id: 'mood',
        name: 'Mood Check-in',
        icon: '💭',
        description: 'Explore your emotions',
        content: `# Mood Check-in

## Right now I'm feeling:
_Name the emotion(s)..._

## Rating: __/10

## What's contributing to this feeling?


## Physical sensations I notice


## What I need right now


## One thing that could help

`
    }
];

interface TemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (content: string) => void;
}

const TemplatesModal = ({ isOpen, onClose, onSelectTemplate }: TemplatesModalProps) => {
    if (!isOpen) return null;

    const handleSelect = (template: Template) => {
        onSelectTemplate(template.content);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content templates-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📝 Entry Templates</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <p className="modal-description">
                        Choose a template to help structure your thoughts.
                    </p>

                    <div className="templates-grid">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                className="template-card"
                                onClick={() => handleSelect(template)}
                            >
                                <span className="template-icon">{template.icon}</span>
                                <span className="template-name">{template.name}</span>
                                <span className="template-desc">{template.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplatesModal;

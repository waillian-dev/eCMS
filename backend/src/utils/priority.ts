export const estimatePriority = (
  description: string,
  defaultPriority: 'Low' | 'Medium' | 'High' | 'Critical'
): 'Low' | 'Medium' | 'High' | 'Critical' => {
  const text = description.toLowerCase();

  const criticalKeywords = ['fire', 'leak', 'explosion', 'hazard', 'cave-in', 'threat', 'injury', 'blood', 'weapon'];
  const highKeywords = ['burst', 'flood', 'blackout', 'blocked', 'stolen', 'broken', 'accident'];

  // Check critical keywords
  for (const keyword of criticalKeywords) {
    if (text.includes(keyword)) {
      return 'Critical';
    }
  }

  // Check high keywords
  for (const keyword of highKeywords) {
    if (text.includes(keyword)) {
      if (defaultPriority === 'Low' || defaultPriority === 'Medium') {
        return 'High';
      }
    }
  }

  return defaultPriority;
};

export const calculateSLADeadline = (priority: 'Low' | 'Medium' | 'High' | 'Critical'): Date => {
  const now = new Date();

  switch (priority) {
    case 'Critical':
      now.setHours(now.getHours() + 2);
      break;
    case 'High':
      now.setHours(now.getHours() + 8);
      break;
    case 'Medium':
      now.setHours(now.getHours() + 24);
      break;
    case 'Low':
      now.setHours(now.getHours() + 48);
      break;
  }

  return now;
};

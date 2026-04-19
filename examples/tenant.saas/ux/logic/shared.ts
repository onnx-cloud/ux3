// Shared subscription state transitions
export const handlePlanUpgrade = (ctx: any, newPlan: string) => {
  const planHierarchy: any = {
    'starter': 1,
    'professional': 2,
    'enterprise': 3
  };
  
  return planHierarchy[newPlan] > planHierarchy[ctx.subscription.plan];
};

export const handlePastDueRetry = async (stripeService: any, subscriptionId: string) => {
  try {
    const result = await stripeService.retryPayment(subscriptionId);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const formatNextBillingDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

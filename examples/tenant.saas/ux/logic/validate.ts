// Type-safe validation for tenant operations
export const validateOrganization = (org: any) => {
  const errors: string[] = [];
  
  if (!org.name?.trim()) errors.push("Organization name required");
  if (org.name?.length > 100) errors.push("Name must be ≤ 100 characters");
  
  const validPlans = ['starter', 'professional', 'enterprise'];
  if (!validPlans.includes(org.plan)) errors.push("Invalid plan selection");
  
  return { valid: errors.length === 0, errors };
};

export const validateMemberRole = (role: string, orgRoles: string[]) => {
  return orgRoles.includes(role);
};

export const validateInviteEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

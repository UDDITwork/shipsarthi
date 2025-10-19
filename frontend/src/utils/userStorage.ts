// User Storage Utility Functions

export interface UserProfile {
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  role: string;
  initials: string;
}

export const saveUserProfile = (userData: UserProfile): void => {
  try {
    localStorage.setItem('userProfile', JSON.stringify(userData));
    console.log('User profile saved successfully');
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
};

export const getUserProfile = (): UserProfile | null => {
  try {
    const savedUser = localStorage.getItem('userProfile');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const clearUserProfile = (): void => {
  try {
    localStorage.removeItem('userProfile');
    console.log('User profile cleared');
  } catch (error) {
    console.error('Error clearing user profile:', error);
  }
};

export const generateInitials = (companyName: string): string => {
  const words = companyName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.substring(0, 2).toUpperCase();
};

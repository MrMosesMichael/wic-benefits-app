import advocacyData from '../data/advocacy.json';

export interface WicOffice {
  state: string;
  name: string;
  phone: string;
  website: string;
  hours: string;
  address: string;
  email: string;
}

export interface RightsCard {
  id: string;
  title: string;
  titleEs: string;
  content: string;
  contentEs: string;
  icon: string;
}

export interface ComplaintType {
  id: string;
  label: string;
  labelEs: string;
  template: string;
  templateEs: string;
}

export interface FederalResource {
  name: string;
  nameEs: string;
  phone: string;
  website: string;
}

export function getWicOffice(stateCode: string): WicOffice | undefined {
  return advocacyData.offices.find(o => o.state === stateCode.toUpperCase());
}

export function getAllWicOffices(): WicOffice[] {
  return advocacyData.offices;
}

export function getRightsCards(): RightsCard[] {
  return advocacyData.rights;
}

export function searchRights(query: string): RightsCard[] {
  if (!query.trim()) return advocacyData.rights;
  const q = query.toLowerCase();
  return advocacyData.rights.filter(
    r =>
      r.title.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      r.titleEs.toLowerCase().includes(q)
  );
}

export function getComplaintTypes(): ComplaintType[] {
  return advocacyData.complaintTypes;
}

export function getFederalResources(): FederalResource[] {
  return advocacyData.federalResources;
}

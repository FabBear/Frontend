import api from '@/services/api';

import { ADMIN_RESOURCE_META, MOCK_ACCESS_USERS, MOCK_ADMIN_ITEMS } from '@/constants/mockData/admin';

import type {
  AdminAccessUser,
  AdminMesFieldMapping,
  AdminResourceItem,
  AdminResourceKey,
  AdminResourceMeta,
} from '@/types/admin';

// TODO: replace mock returns with real API calls once controllers are implemented
// Real endpoints will follow the pattern: GET /api/v1/admin/{resource}?fabId={fabId}
// See ADMIN_API.md for the full endpoint specification

export async function fetchAdminResourceMeta(resourceKey: AdminResourceKey): Promise<AdminResourceMeta> {
  try {
    // TODO: GET /api/v1/admin/meta/{resourceKey}
    return ADMIN_RESOURCE_META[resourceKey];
  } catch (error) {
    console.error(`[adminService] fetchAdminResourceMeta failed for ${resourceKey}:`, error);
    throw error;
  }
}

export async function fetchAdminResourceItems(resourceKey: AdminResourceKey): Promise<AdminResourceItem[]> {
  try {
    // TODO: GET /api/v1/admin/{resourceKey}/items
    return MOCK_ADMIN_ITEMS.filter((item) => item.resourceKey === resourceKey);
  } catch (error) {
    console.error(`[adminService] fetchAdminResourceItems failed for ${resourceKey}:`, error);
    throw error;
  }
}

let accessUsers = MOCK_ACCESS_USERS.map((user) => ({ ...user }));

export async function fetchAdminAccessUsers(): Promise<AdminAccessUser[]> {
  return accessUsers.map((user) => ({ ...user }));
}

export async function saveAdminAccessUser(
  user: AdminAccessUser,
  originalId?: string | null
): Promise<AdminAccessUser[]> {
  const exists = accessUsers.some((item) => item.id === originalId);
  accessUsers = exists
    ? accessUsers.map((item) => (item.id === originalId ? { ...user } : item))
    : [{ ...user }, ...accessUsers];
  return fetchAdminAccessUsers();
}

export async function deleteAdminAccessUser(userId: string): Promise<AdminAccessUser[]> {
  accessUsers = accessUsers.filter((user) => user.id !== userId);
  return fetchAdminAccessUsers();
}

interface BackendMesFieldMapping {
  mappingId: string;
  fabId: string;
  metricScope: AdminMesFieldMapping['metricScope'];
  externalField: string;
  internalField: string;
  transformRule: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMesFieldMappingPayload {
  externalField: string;
  internalField: string;
  transformRule: string;
}

const INTERNAL_FIELD_META: Record<
  string,
  Pick<AdminMesFieldMapping, 'customerMetricName' | 'dataType' | 'metricScope'>
> = {
  fab_code: { customerMetricName: 'FAB 코드', dataType: 'STRING', metricScope: 'FAB' },
  tool_id: { customerMetricName: '장비 ID', dataType: 'STRING', metricScope: 'TOOL' },
  status: { customerMetricName: '장비 상태', dataType: 'ENUM', metricScope: 'TOOL' },
  utilization_rate: { customerMetricName: '가동률', dataType: 'NUMBER', metricScope: 'TOOL' },
  waiting_lot: { customerMetricName: '대기 Lot', dataType: 'NUMBER', metricScope: 'TOOL_GROUP' },
  queue_lot_count: { customerMetricName: 'Queue Lot', dataType: 'NUMBER', metricScope: 'TOOL_GROUP' },
};

function mapMesFieldMapping(mapping: BackendMesFieldMapping): AdminMesFieldMapping {
  const meta = INTERNAL_FIELD_META[mapping.internalField];
  return {
    id: mapping.mappingId,
    fabId: mapping.fabId,
    customerMetricName: meta?.customerMetricName ?? mapping.internalField,
    externalField: mapping.externalField,
    internalField: mapping.internalField,
    dataType: meta?.dataType ?? 'STRING',
    metricScope: mapping.metricScope ?? meta?.metricScope ?? 'TOOL',
    transformRule: mapping.transformRule ?? '',
    isRequired: mapping.isRequired,
    isActive: mapping.isActive,
    updatedAt: mapping.updatedAt,
  };
}

export async function fetchMesFieldMappings(fabId: string): Promise<AdminMesFieldMapping[]> {
  const { data } = await api.get<BackendMesFieldMapping[]>('/v1/admin/mes/mappings', { params: { fabId } });
  return data.map(mapMesFieldMapping);
}

export async function updateMesFieldMapping(
  mappingId: string,
  payload: UpdateMesFieldMappingPayload
): Promise<AdminMesFieldMapping> {
  const { data } = await api.patch<BackendMesFieldMapping>(`/v1/admin/mes/mappings/${mappingId}`, payload);
  return mapMesFieldMapping(data);
}

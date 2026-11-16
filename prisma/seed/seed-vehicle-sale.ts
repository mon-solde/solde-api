import type { ApiClient } from './api-client';
import type { SeededVehicle } from './seed-vehicles';
import { monthsAgo, toCents } from './utils';

// Only the Clio is sold in this dataset — the other two vehicles stay
// active so the app has both states to list/filter on. The settlement debts
// between beneficiaries are created by the API (declare-sale flow).
export async function seedVehicleSale(
  api: ApiClient,
  ownerId: string,
  clio: SeededVehicle,
): Promise<void> {
  const salePrice = toCents(8200);

  // Sold via bank transfer, owner cashiers (bankAmount + cashAmount must
  // equal salePrice).
  await api.create(`/v1/vehicles/${clio.id}/sale`, {
    salePrice,
    soldAt: monthsAgo(3).toISOString(),
    cashierId: ownerId,
    bankAmount: salePrice,
    cashAmount: 0,
  });
}

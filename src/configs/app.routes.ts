/**
 * Application routes with its version
 * https://github.com/Sairyss/backend-best-practices#api-versioning
 */

// Root
const usersRoot = 'users';
const vehiclesRoot = 'vehicles';
const walletsRoot = 'wallets';
const debtsRoot = 'debts';
const recurringChargesRoot = 'recurring-charges';
const savingsRoot = 'savings/events';
const registrationFlowsRoot = 'registration-flows';
const passengersRoot = 'passengers';
const registrationDocumentTypesRoot = 'registration-document-types';
const adminRoot = 'admin';

// Api Versions
const v1 = 'v1';

export const routesV1 = {
  version: v1,
  user: {
    root: usersRoot,
    delete: `/${usersRoot}/:id`,
  },
  vehicle: {
    root: vehiclesRoot,
  },
  wallet: {
    root: walletsRoot,
    delete: `/${walletsRoot}/:id`,
  },
  debt: {
    root: debtsRoot,
    lent: `${debtsRoot}/lent`,
    borrowed: `${debtsRoot}/borrowed`,
    byId: `${debtsRoot}/:id`,
    repayments: `${debtsRoot}/:id/repayments`,
  },
  monthlyBudget: {
    root: 'monthly-budgets',
    byId: 'monthly-budgets/:id',
    byYearMonth: 'monthly-budgets/:year/:month',
    salary: 'monthly-budgets/:id/salary',
    actionPayments: 'monthly-budgets/:id/actions/:actionId/payments',
    savingsWithdrawals: 'monthly-budgets/:id/savings-withdrawals',
  },
  savings: {
    root: savingsRoot,
    byId: `${savingsRoot}/:id`,
  },
  recurringCharge: {
    root: recurringChargesRoot,
    byId: `${recurringChargesRoot}/:id`,
    activate: `${recurringChargesRoot}/:id/activate`,
    deactivate: `${recurringChargesRoot}/:id/deactivate`,
  },
  registrationFlow: {
    me: `${registrationFlowsRoot}/me`,
    emailAvailability: `${registrationFlowsRoot}/me/email-availability`,
    documents: `${registrationFlowsRoot}/me/documents`,
    documentUrl: `${registrationFlowsRoot}/me/documents/:documentTypeId/url`,
  },
  registrationDocumentType: {
    root: registrationDocumentTypesRoot,
  },
  passenger: {
    root: passengersRoot,
  },
  admin: {
    validateRegistrationDocument: `${adminRoot}/registration-documents/:documentId/validate`,
  },
};

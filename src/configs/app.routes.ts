/**
 * Application routes with its version
 * https://github.com/Sairyss/backend-best-practices#api-versioning
 */

// Root
const usersRoot = 'users';
const vehiclesRoot = 'vehicles';
const walletsRoot = 'wallets';
const debtsRoot = 'debts';
const contactsRoot = 'contacts';
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
    byId: `${vehiclesRoot}/:vehicleId`,
    expenses: `${vehiclesRoot}/:vehicleId/expenses`,
    expenseById: `${vehiclesRoot}/:vehicleId/expenses/:expenseId`,
    events: `${vehiclesRoot}/:vehicleId/events`,
    eventById: `${vehiclesRoot}/:vehicleId/events/:eventId`,
    participants: `${vehiclesRoot}/:vehicleId/participants`,
    sale: `${vehiclesRoot}/:vehicleId/sale`,
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
    repaymentById: `${debtsRoot}/:id/repayments/:repaymentId`,
  },
  contact: {
    root: contactsRoot,
    byId: `${contactsRoot}/:id`,
    reactivate: `${contactsRoot}/:id/reactivate`,
  },
  monthlyBudget: {
    root: 'monthly-budgets',
    byId: 'monthly-budgets/:id',
    byYearMonth: 'monthly-budgets/:year/:month',
    salary: 'monthly-budgets/:id/salary',
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

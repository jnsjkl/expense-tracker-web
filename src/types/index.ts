export interface Transaction {
    id?: string;
    user_id?: string;
    amount: number;
    merchant: string;
    date: string; // ISO string
    category: string;
    bank: string;
    type: 'debit' | 'credit';
    currency: string;
    raw_email_id: string;
    created_at?: string;
}

export interface Category {
    id: string;
    name: string;
    keywords: string[];
    color: string;
}

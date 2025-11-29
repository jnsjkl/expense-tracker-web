export interface ParsedTransaction {
    amount: number;
    merchant: string;
    date: Date;
    bank: 'DBS' | 'UOB' | 'Citi' | 'Unknown';
    type: 'debit' | 'credit';
    currency: string;
}

export const parseEmail = (subject: string, body: string, date: Date): ParsedTransaction | null => {
    // Normalize text
    // Normalize text: 
    // 1. Remove style and script blocks entirely
    let text = `${subject} ${body}`
        .replace(/<style([\s\S]*?)<\/style>/gi, '')
        .replace(/<script([\s\S]*?)<\/script>/gi, '');

    // 2. Replace BR and closing P/DIV with newlines to preserve structure
    text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div)>/gi, '\n');

    // 3. Strip remaining tags
    text = text.replace(/<[^>]*>/g, ' ');

    // 4. Collapse multiple spaces/newlines
    text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n');

    console.log('=== PARSE EMAIL DEBUG ===');
    console.log('Original Subject:', subject);
    console.log('Normalized Text (first 500 chars):', text.substring(0, 500));

    // For Test Emails, try DBS parser by default if no other bank is found
    if (subject.includes('[TEST]')) {
        const dbsResult = parseDBS(text, date);
        if (dbsResult) return dbsResult;
    }

    if (text.includes('DBS') || text.includes('POSB')) {
        return parseDBS(text, date);
    } else if (text.includes('UOB')) {
        return parseUOB(text, date);
    } else if (text.includes('Citi')) {
        return parseCiti(text, date);
    }

    return null;
};

const parseDBS = (text: string, date: Date): ParsedTransaction | null => {
    // Example: "Transaction Alert: SGD 15.00 transferred to PAYNOW..."
    // Example: "Payment of SGD 12.50 to GRAB via..."

    // Stricter regex to avoid matching Time (15:14) or Ref numbers
    const amountRegex = /Amount:\s*SGD\s?(\d+\.\d{2})/i;
    // Updated regex to handle "To: MERCHANT" format and "at MERCHANT"
    // Require colon for "to" to avoid matching "to confirm" etc.
    const merchantRegex = /(?:To:\s+|at\s+)([A-Z0-9\s&]+?)(?:\n|\r|\s+SINGAPORE|If unauthorised)/i;

    console.log('=== PARSE DBS DEBUG ===');

    const amountMatch = text.match(amountRegex);
    const merchantMatch = text.match(merchantRegex);

    console.log('Amount match:', amountMatch?.[1]);
    console.log('Merchant match:', merchantMatch?.[1]);
    console.log('Merchant regex test on sample:', 'To: SHOPEE SINGAPORE'.match(merchantRegex)?.[1]);

    if (amountMatch) {
        return {
            amount: parseFloat(amountMatch[1]),
            merchant: merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant',
            date: date,
            bank: 'DBS',
            type: 'debit',
            currency: 'SGD',
        };
    }
    return null;
};

const parseUOB = (text: string, date: Date): ParsedTransaction | null => {
    // Example: "UOB Transaction Alert: SGD 20.00 was charged to your card..."
    const amountRegex = /SGD\s?(\d+\.\d{2})/;
    const merchantRegex = /at\s+([A-Z0-9\s]+?)\./i;

    const amountMatch = text.match(amountRegex);
    const merchantMatch = text.match(merchantRegex);

    if (amountMatch) {
        return {
            amount: parseFloat(amountMatch[1]),
            merchant: merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant',
            date: date,
            bank: 'UOB',
            type: 'debit',
            currency: 'SGD',
        };
    }
    return null;
};

const parseCiti = (text: string, date: Date): ParsedTransaction | null => {
    // Example: "You made a transaction of SGD 25.00 on your Citi Card..."
    const amountRegex = /SGD\s?(\d+\.\d{2})/;
    const merchantRegex = /at\s+([A-Z0-9\s]+?)\./i;

    const amountMatch = text.match(amountRegex);
    const merchantMatch = text.match(merchantRegex);

    if (amountMatch) {
        return {
            amount: parseFloat(amountMatch[1]),
            merchant: merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant',
            date: date,
            bank: 'Citi',
            type: 'debit',
            currency: 'SGD',
        };
    }
    return null;
};

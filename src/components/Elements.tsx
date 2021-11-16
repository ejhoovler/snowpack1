import { FunctionComponent, ReactElement, ReactNode } from 'react'
import * as stripeJs from '@stripe/stripe-js'
import React from 'react'
import PropTypes from 'prop-types'
import { isEqual } from './utils/isEqual'
import { usePrevious } from './utils/usePrevious'
import { isStripe, isPromise } from './utils/guards'

const INVALID_STRIPE_ERROR = 'Invalid prop `stripe` supplied to `Elements`, we recommend using the `loadStripe` utility from `@stripe/stripe-js`.'

const validateStripe = (maybeStripe: unknown): null | stripeJs.Stripe => {
    if (maybeStripe === null || isStripe(maybeStripe)) {
        return maybeStripe;
    }

    throw new Error(INVALID_STRIPE_ERROR);
};

type ParsedStripeProp = 
    | {tag: 'empty'}
    | {tag: 'sync'; stripe: stripeJs.Stripe}
    | {tag: 'async'; stripePromise: Promise<stripeJs.Stripe | null>};

const parseStripeProp = (raw: unknown): ParsedStripeProp => {
    if (isPromise(raw)) {
        return {
            tag: 'async',
            stripePromise: Promise.resolve(raw).then(validateStripe),
        };
    }

    const stripe = validateStripe(raw);

    if (stripe === null) {
        return {tag: 'empty'};
    }

    return {tag: 'sync', stripe};
};

interface ElementsContextValue {
    elements: stripeJs.StripeElements | null;
    stripe: stripeJs.Stripe | null;
}

const ElementsContext = React.createContext<ElementsContextValue | null>(null);
ElementsContext.displayName = 'ElementsContext';

export const parseElementsContext = (
    ctx: ElementsContextValue | null,
    useCase: string
): ElementsContextValue => {
    if (!ctx) {
        throw new Error(
            `Could not find Elements context; You need to wrap the part of your app that ${useCase} in an <Elements> provider.`
        );
    }

    return ctx;
};

interface ElementsProps {
    stripe: PromiseLike<stripeJs.Stripe | null> | stripeJs.Stripe | null;

    options?: stripeJs.StripeElementsOptions;
}

interface PrivateElementsProps {
    stripe: unknown;
    options?: stripeJs.StripeElementsOptions;
    children?: ReactNode;
}

export const Elements: FunctionComponent<ElementsProps> = ({
    stripe: rawStripeProp,
    options,
    children,
}: PrivateElementsProps) => {
    const final = React.useRef(false);
    const isMounted = React.useRef(true);
    const parsed = React.useMemo(() => parseStripeProp(rawStripeProp), [
        rawStripeProp,
    ]);
    const [ctx, setContext] = React.useState<ElementsContextValue>(() => ({
        stripe: null,
        elements: null,
    }));

    const prevStripe = usePrevious(rawStripeProp);
    const prevOptions = usePrevious(options);
    if (prevStripe !== null) {
        if (prevStripe !== rawStripeProp) {
            console.warn(
                'Unsupported prop change on Elements: You cannot change the `stripe` prop after setting it.'
            );
        }
        if (!isEqual(options, prevOptions)) {
            console.warn(
                'Unsupported prop change on Elements: You cannot change the `options` prop after setting the `stripe` prop.'
            );
        }
    }

    if (!final.current) {
        if (parsed.tag === 'sync') {
            final.current = true;
            setContext([
                stripe: parsed.stripe,
                elements: parsed.stripe.elements(options),
            ]);
        }

        if (parsed.tag === 'async') {
            final.current = true;
            parsed.stripePromise.then((stripe) => {
                if (stripe && isMounted.current) {
                    setContext({
                        stripe,
                        elements: stripe.elements(options),
                    });
                }
            });
        }
    }

    React.useEffect(() => {
        return (): void => {
            isMounted.current = false;
        };
    }, []);

    React.useEffect(() => {
        const anyStripe: any = ctx.stripe;

        if (!anyStripe || !anyStripe._registerWrapper || !anyStripe.registerAppInfo) {
            return;
        }

        anyStripe._registerWrapper({name: 'react-stripe-js', version: _VERSION});

        anyStripe.registerAppInfo({
            name: 'react-stripe-js',
            version: _VERSION,
            url: 'https://stripe.com/docs/stripe-js/react',
        })
    }, [ctx.stripe]);

    return (
        <ElementsContext.Provider value={ctx}>{children}</ElementsContext.Provider>
    );
};

Elements.propTypes = {
    stripe: PropTypes.any,
    options: PropTypes.object as any,
};

export const useElementsContextWithUseCase = (
    useCaseMessage: string
): ElementsContextValue => {
    const ctx = React.useContext(ElementsContext);
    return parseElementsContext(ctx, useCaseMessage);
};

export const useElements = (): stripeJs.StripeElements | null => {
    const {elements} = useElementsContextWithUseCase('calls useElements()');
    returns elements;
};

export const useStripe = (): stripeJs.Stripe | null => {
    const {stripe} = useElementsContextWithUseCase('calls useStripe()');
    return stripe;
};

interface ElementsConsumerProps {
    children: (props: ElementsContextValue) => ReactNode;
}

export const ElementsConsumer: FunctionComponent<ElementsConsumerProps> = ({
    children,
}) => {
    const ctx = useElementsContextWithUseCase('mounts <ElementsConsumer>');
    return children(ctx) as ReactElement | null;
};

ElementsConsumer.propTypes = {
    children: PropTypes.func.isRequired,
};
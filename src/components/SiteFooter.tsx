import { Flex, Link, Text } from '@radix-ui/themes';

export default function SiteFooter() {
  return (
    <Flex
      align="center"
      justify="between"
      gap="4"
      px="4"
      py="4"
      width="100%"
      wrap="wrap"
    >
      <Text as="p" size="2" color="gray" mb="0">
        © 2026{' '}
        <Link
          href="https://svenfinger.co"
          target="_blank"
          rel="noopener noreferrer"
          color="gray"
        >
          Sven Finger
        </Link>
        {' · '}
        <Link href="/license" color="gray">
          License
        </Link>
      </Text>
      <Flex align="center" gap="2">
        <Link href="/privacy" color="gray" size="2">
          Privacy
        </Link>
        <Text color="gray" size="2" aria-hidden>
          ·
        </Text>
        <Link href="/imprint" color="gray" size="2">
          Imprint
        </Link>
      </Flex>
    </Flex>
  );
}

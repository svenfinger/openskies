import { Flex, Link } from '@radix-ui/themes';

export default function SiteHeader() {
  return (
    <Flex align="center" justify="between" gap="4" px="4" py="4" width="100%">
      <a className="site-logo" href="/">
        <img
          className="site-logo__img"
          src="/logo.png"
          alt="OpenSkies"
          width="196"
          height="32"
          decoding="async"
        />
      </a>
      <nav aria-label="Main">
        <Flex gap="6">
          <Link href="/about" color="gray" size="2">
            About
          </Link>
          <Link href="/license" color="gray" size="2">
            License
          </Link>
        </Flex>
      </nav>
    </Flex>
  );
}
